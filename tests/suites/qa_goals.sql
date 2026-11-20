\set ON_ERROR_STOP off
\pset format unaligned
\pset tuples_only on
create temp table res(n text, ok boolean, info text);
grant all on res to public;
insert into auth.users(id,email) values ('dddddddd-0000-0000-0000-000000000004','d@test.com'),('eeeeeeee-0000-0000-0000-000000000005','e@test.com') on conflict do nothing;
delete from user_plans where user_id in ('dddddddd-0000-0000-0000-000000000004','eeeeeeee-0000-0000-0000-000000000005');
delete from household_members where user_id in ('dddddddd-0000-0000-0000-000000000004','eeeeeeee-0000-0000-0000-000000000005');
delete from public.goals;
-- A: crea 2 metas y aporta
set role authenticated; set request.uid='dddddddd-0000-0000-0000-000000000004';
insert into goals(name,icon,target_amount,target_date) values ('Casa','home',50000,'2030-01-01'),('Viaje','plane',3000,'2027-06-01');
insert into res select 'A crea 2 metas gratis', count(*)=2, count(*)::text from goals;
do $$ begin
  begin insert into goals(name,icon,target_amount) values ('Tercera','car',1000); insert into res values('Gratis: tercera meta bloqueada',false,'se permitió'); exception when others then insert into res values('Gratis: tercera meta bloqueada', sqlerrm like '%limit_goals%', sqlerrm); end;
end $$;
insert into goal_contributions(goal_id,amount,note) select id,500,'primer aporte' from goals where name='Casa';
insert into goal_contributions(goal_id,amount) select id,250 from goals where name='Casa';
insert into goal_contributions(goal_id,amount,note) select id,-100,'retiro' from goals where name='Casa';
insert into res select 'Suma de aportes = 650', coalesce(sum(amount),0)=650, sum(amount)::text from goal_contributions;
update goals set archived=true;
-- validaciones
do $$ begin begin insert into goals(name,icon,target_amount) values ('',  'x',10); insert into res values('nombre vacío rechazado',false,''); exception when others then insert into res values('nombre vacío rechazado', sqlerrm not like '%limit_goals%' and sqlerrm like '%violates check%',sqlerrm); end; end $$;
do $$ begin begin insert into goals(name,icon,target_amount) values (repeat('a',61),'x',10); insert into res values('nombre >60 rechazado',false,''); exception when others then insert into res values('nombre >60 rechazado', sqlerrm not like '%limit_goals%' and sqlerrm like '%violates check%',sqlerrm); end; end $$;
do $$ begin begin insert into goals(name,icon,target_amount) values ('X','<img>',10); insert into res values('icono con HTML rechazado',false,''); exception when others then insert into res values('icono con HTML rechazado', sqlerrm not like '%limit_goals%' and sqlerrm like '%violates check%',sqlerrm); end; end $$;
do $$ begin begin insert into goals(name,icon,target_amount) values ('X','ok',0); insert into res values('monto objetivo 0 rechazado',false,''); exception when others then insert into res values('monto objetivo 0 rechazado', sqlerrm not like '%limit_goals%' and sqlerrm like '%violates check%',sqlerrm); end; end $$;
do $$ begin begin insert into goals(name,icon,target_amount) values ('X','ok',-5); insert into res values('monto objetivo negativo rechazado',false,''); exception when others then insert into res values('monto objetivo negativo rechazado', sqlerrm not like '%limit_goals%' and sqlerrm like '%violates check%',sqlerrm); end; end $$;
do $$ begin begin insert into goal_contributions(goal_id,amount) select id,0 from goals limit 1; insert into res values('aporte 0 rechazado',false,''); exception when others then insert into res values('aporte 0 rechazado', sqlerrm not like '%limit_goals%' and sqlerrm like '%violates check%',sqlerrm); end; end $$;
do $$ begin begin insert into goal_contributions(goal_id,amount,note) select id,1,repeat('n',201) from goals limit 1; insert into res values('nota >200 rechazada',false,''); exception when others then insert into res values('nota >200 rechazada', sqlerrm not like '%limit_goals%' and sqlerrm like '%violates check%',sqlerrm); end; end $$;
update goals set archived=false;
-- archivar libera cupo
update goals set archived=true where name='Viaje';
insert into goals(name,icon,target_amount) values ('Carro','car',20000);
insert into res select 'Archivar libera cupo (3ª meta ahora entra)', count(*) filter (where not archived)=2, count(*)::text from goals;
-- B: aislamiento
set request.uid='eeeeeeee-0000-0000-0000-000000000005';
insert into res select 'B no ve metas de A', count(*)=0, count(*)::text from goals;
insert into res select 'B no ve aportes de A', count(*)=0, count(*)::text from goal_contributions;
update goals set target_amount=1 where name='Casa';
delete from goals where name='Casa';
delete from goal_contributions;
do $$ begin begin insert into goal_contributions(goal_id,amount) select id,999 from (select id from public.goals limit 1) x; insert into res values('B no puede aportar a meta ajena (vía vista)',true,'sin filas'); exception when others then insert into res values('B no puede aportar a meta ajena',true,sqlerrm); end; end $$;
reset role;
insert into res select 'metas de A intactas tras ataque de B', target_amount=50000, target_amount::text from goals where name='Casa';
insert into res select 'aportes de A intactos tras ataque de B', count(*)=3, count(*)::text from goal_contributions;
-- B intenta aportar a la meta de A por id directo
set role authenticated; set request.uid='eeeeeeee-0000-0000-0000-000000000005';
do $$ declare gid uuid; begin
  select id into gid from public.goals where false; 
end $$;
reset role;
do $$ declare gid uuid; begin
  select id into gid from public.goals where name='Casa';
  perform set_config('request.uid','eeeeeeee-0000-0000-0000-000000000005',false);
  set local role authenticated;
  begin insert into public.goal_contributions(goal_id,amount) values (gid, 777); insert into res values('B no puede aportar a meta de A por id',false,'se permitió'); exception when others then insert into res values('B no puede aportar a meta de A por id',true,sqlerrm); end;
  reset role;
end $$;
-- Hogar: meta compartida
insert into households(id,name,owner_id) values ('11111111-1111-1111-1111-111111111111','Casa QA','dddddddd-0000-0000-0000-000000000004') on conflict do nothing;
insert into household_members(household_id,user_id) values ('11111111-1111-1111-1111-111111111111','dddddddd-0000-0000-0000-000000000004'),('11111111-1111-1111-1111-111111111111','eeeeeeee-0000-0000-0000-000000000005') on conflict do nothing;
set role authenticated; set request.uid='dddddddd-0000-0000-0000-000000000004';
insert into goals(name,icon,target_amount,household_id) values ('Vacaciones familia','plane',4000,'11111111-1111-1111-1111-111111111111');
insert into goal_contributions(goal_id,amount) select id,300 from goals where name='Vacaciones familia';
set request.uid='eeeeeeee-0000-0000-0000-000000000005';
insert into res select 'B (miembro) ve la meta compartida', count(*)=1, count(*)::text from goals;
insert into goal_contributions(goal_id,amount) select id,200 from goals where name='Vacaciones familia';
insert into res select 'B aporta a la meta compartida; ambos aportes visibles', count(*)=2, count(*)::text from goal_contributions;
delete from goal_contributions where amount=300;
insert into res select 'B no borra el aporte de A', count(*)=2, count(*)::text from goal_contributions;
reset role;
delete from household_members where user_id='eeeeeeee-0000-0000-0000-000000000005';
set role authenticated; set request.uid='eeeeeeee-0000-0000-0000-000000000005';
insert into res select 'B pierde acceso al salir del hogar', count(*)=0, count(*)::text from goals;
reset role;
delete from goals; delete from household_members where household_id='11111111-1111-1111-1111-111111111111'; delete from households where id='11111111-1111-1111-1111-111111111111';
select case when ok then 'OK    | ' else 'FALLA | ' end || n || ' | ' || coalesce(info,'') from res;
