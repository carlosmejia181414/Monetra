\set ON_ERROR_STOP off
\pset format unaligned
\pset tuples_only on
create temp table res(n text, ok boolean, info text);
grant all on res to public;
insert into auth.users(id,email) values ('dddddddd-0000-0000-0000-000000000004','d@test.com'),('eeeeeeee-0000-0000-0000-000000000005','e@test.com') on conflict do nothing;
delete from user_plans where user_id in ('dddddddd-0000-0000-0000-000000000004','eeeeeeee-0000-0000-0000-000000000005');
delete from household_members where user_id in ('dddddddd-0000-0000-0000-000000000004','eeeeeeee-0000-0000-0000-000000000005');
delete from public.debts;
-- A: crea 2 metas y aporta
set role authenticated; set request.uid='dddddddd-0000-0000-0000-000000000004';
insert into debts(name,kind,start_balance,interest_rate,min_payment,due_day) values ('Casa','mortgage',50000,5.5,400,15),('Viaje','card',3000,19.9,90,null);
insert into res select 'A crea 2 metas gratis', count(*)=2, count(*)::text from debts;
do $$ begin
  begin insert into debts(name,kind,start_balance) values ('Tercera','car',1000); insert into res values('Gratis: tercera meta bloqueada',false,'se permitió'); exception when others then insert into res values('Gratis: tercera meta bloqueada', sqlerrm like '%limit_debts%', sqlerrm); end;
end $$;
insert into debt_payments(debt_id,amount,note) select id,500,'primer aporte' from debts where name='Casa';
insert into debt_payments(debt_id,amount) select id,250 from debts where name='Casa';
insert into debt_payments(debt_id,amount,note) select id,-100,'retiro' from debts where name='Casa';
insert into res select 'Suma de pagos = 650', coalesce(sum(amount),0)=650, sum(amount)::text from debt_payments;
update debts set archived=true;
-- validaciones
do $$ begin begin insert into debts(name,kind,start_balance) values ('',  'x',10); insert into res values('nombre vacío rechazado',false,''); exception when others then insert into res values('nombre vacío rechazado', sqlerrm not like '%limit_debts%' and sqlerrm like '%violates check%',sqlerrm); end; end $$;
do $$ begin begin insert into debts(name,kind,start_balance) values (repeat('a',61),'x',10); insert into res values('nombre >60 rechazado',false,''); exception when others then insert into res values('nombre >60 rechazado', sqlerrm not like '%limit_debts%' and sqlerrm like '%violates check%',sqlerrm); end; end $$;
do $$ begin begin insert into debts(name,kind,start_balance) values ('X','<img>',10); insert into res values('icono con HTML rechazado',false,''); exception when others then insert into res values('icono con HTML rechazado', sqlerrm not like '%limit_debts%' and sqlerrm like '%violates check%',sqlerrm); end; end $$;
do $$ begin begin insert into debts(name,kind,start_balance) values ('X','ok',0); insert into res values('monto objetivo 0 rechazado',false,''); exception when others then insert into res values('monto objetivo 0 rechazado', sqlerrm not like '%limit_debts%' and sqlerrm like '%violates check%',sqlerrm); end; end $$;
do $$ begin begin insert into debts(name,kind,start_balance) values ('X','ok',-5); insert into res values('monto objetivo negativo rechazado',false,''); exception when others then insert into res values('monto objetivo negativo rechazado', sqlerrm not like '%limit_debts%' and sqlerrm like '%violates check%',sqlerrm); end; end $$;
do $$ begin begin insert into debt_payments(debt_id,amount) select id,0 from debts limit 1; insert into res values('aporte 0 rechazado',false,''); exception when others then insert into res values('aporte 0 rechazado', sqlerrm not like '%limit_debts%' and sqlerrm like '%violates check%',sqlerrm); end; end $$;
do $$ begin begin insert into debt_payments(debt_id,amount,note) select id,1,repeat('n',201) from debts limit 1; insert into res values('nota >200 rechazada',false,''); exception when others then insert into res values('nota >200 rechazada', sqlerrm not like '%limit_debts%' and sqlerrm like '%violates check%',sqlerrm); end; end $$;
do $$ begin begin insert into debts(name,kind,start_balance,interest_rate) values ('X','ok',10,150); insert into res values('tasa >100 rechazada',false,''); exception when others then insert into res values('tasa >100 rechazada', sqlerrm not like '%limit_debts%' and sqlerrm like '%violates check%',sqlerrm); end; end $$;
do $$ begin begin insert into debts(name,kind,start_balance,interest_rate) values ('X','ok',10,-1); insert into res values('tasa negativa rechazada',false,''); exception when others then insert into res values('tasa negativa rechazada', sqlerrm not like '%limit_debts%' and sqlerrm like '%violates check%',sqlerrm); end; end $$;
do $$ begin begin insert into debts(name,kind,start_balance,min_payment) values ('X','ok',10,-5); insert into res values('pago mínimo negativo rechazado',false,''); exception when others then insert into res values('pago mínimo negativo rechazado', sqlerrm not like '%limit_debts%' and sqlerrm like '%violates check%',sqlerrm); end; end $$;
do $$ begin begin insert into debts(name,kind,start_balance,due_day) values ('X','ok',10,32); insert into res values('día de vencimiento 32 rechazado',false,''); exception when others then insert into res values('día de vencimiento 32 rechazado', sqlerrm not like '%limit_debts%' and sqlerrm like '%violates check%',sqlerrm); end; end $$;
update debts set archived=false;
-- archivar libera cupo
update debts set archived=true where name='Viaje';
insert into debts(name,kind,start_balance) values ('Carro','car',20000);
insert into res select 'Archivar libera cupo (3ª meta ahora entra)', count(*) filter (where not archived)=2, count(*)::text from debts;
-- B: aislamiento
set request.uid='eeeeeeee-0000-0000-0000-000000000005';
insert into res select 'B no ve metas de A', count(*)=0, count(*)::text from debts;
insert into res select 'B no ve aportes de A', count(*)=0, count(*)::text from debt_payments;
update debts set start_balance=1 where name='Casa';
delete from debts where name='Casa';
delete from debt_payments;
do $$ begin begin insert into debt_payments(debt_id,amount) select id,999 from (select id from public.debts limit 1) x; insert into res values('B no puede aportar a meta ajena (vía vista)',true,'sin filas'); exception when others then insert into res values('B no puede aportar a meta ajena',true,sqlerrm); end; end $$;
reset role;
insert into res select 'metas de A intactas tras ataque de B', start_balance=50000, start_balance::text from debts where name='Casa';
insert into res select 'aportes de A intactos tras ataque de B', count(*)=3, count(*)::text from debt_payments;
-- B intenta aportar a la meta de A por id directo
set role authenticated; set request.uid='eeeeeeee-0000-0000-0000-000000000005';
do $$ declare gid uuid; begin
  select id into gid from public.debts where false; 
end $$;
reset role;
do $$ declare gid uuid; begin
  select id into gid from public.debts where name='Casa';
  perform set_config('request.uid','eeeeeeee-0000-0000-0000-000000000005',false);
  set local role authenticated;
  begin insert into public.debt_payments(debt_id,amount) values (gid, 777); insert into res values('B no puede aportar a meta de A por id',false,'se permitió'); exception when others then insert into res values('B no puede aportar a meta de A por id',true,sqlerrm); end;
  reset role;
end $$;
-- Hogar: meta compartida
insert into households(id,name,owner_id) values ('11111111-1111-1111-1111-111111111111','Casa QA','dddddddd-0000-0000-0000-000000000004') on conflict do nothing;
insert into household_members(household_id,user_id) values ('11111111-1111-1111-1111-111111111111','dddddddd-0000-0000-0000-000000000004'),('11111111-1111-1111-1111-111111111111','eeeeeeee-0000-0000-0000-000000000005') on conflict do nothing;
set role authenticated; set request.uid='dddddddd-0000-0000-0000-000000000004';
insert into debts(name,kind,start_balance,household_id) values ('Vacaciones familia','plane',4000,'11111111-1111-1111-1111-111111111111');
insert into debt_payments(debt_id,amount) select id,300 from debts where name='Vacaciones familia';
set request.uid='eeeeeeee-0000-0000-0000-000000000005';
insert into res select 'B (miembro) ve la meta compartida', count(*)=1, count(*)::text from debts;
insert into debt_payments(debt_id,amount) select id,200 from debts where name='Vacaciones familia';
insert into res select 'B aporta a la meta compartida; ambos aportes visibles', count(*)=2, count(*)::text from debt_payments;
delete from debt_payments where amount=300;
insert into res select 'B no borra el aporte de A', count(*)=2, count(*)::text from debt_payments;
reset role;
delete from household_members where user_id='eeeeeeee-0000-0000-0000-000000000005';
set role authenticated; set request.uid='eeeeeeee-0000-0000-0000-000000000005';
insert into res select 'B pierde acceso al salir del hogar', count(*)=0, count(*)::text from debts;
reset role;
delete from debts; delete from household_members where household_id='11111111-1111-1111-1111-111111111111'; delete from households where id='11111111-1111-1111-1111-111111111111';
select case when ok then 'OK    | ' else 'FALLA | ' end || n || ' | ' || coalesce(info,'') from res;
