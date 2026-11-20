\set ON_ERROR_STOP off
\pset format unaligned
\pset tuples_only on
create table if not exists delres(n text, ok boolean, info text);
truncate delres; grant all on delres to public;
-- limpieza previa
delete from auth.users where id in ('d1d1d1d1-0000-0000-0000-0000000000d1','d2d2d2d2-0000-0000-0000-0000000000d2','d3d3d3d3-0000-0000-0000-0000000000d3');
insert into auth.users(id,email) values ('d1d1d1d1-0000-0000-0000-0000000000d1','del1@t.com'),('d2d2d2d2-0000-0000-0000-0000000000d2','del2@t.com'),('d3d3d3d3-0000-0000-0000-0000000000d3','keep@t.com');
insert into user_plans(user_id,plan,source) values ('d1d1d1d1-0000-0000-0000-0000000000d1','pro','admin'),('d2d2d2d2-0000-0000-0000-0000000000d2','pro','admin') on conflict (user_id) do update set plan='pro',source='admin';
-- datos personales de D1 (que se borrará) y de D3 (que debe quedar intacto)
set role authenticated; set request.uid='d1d1d1d1-0000-0000-0000-0000000000d1';
insert into categories(id,name,kind) values ('del-c1','Personal1','fixed');
insert into transactions(date,type,category_id,amount) values ('2026-11-01','fixed','del-c1',10),('2026-11-02','fixed','del-c1',20);
insert into goals(id,name,icon,target_amount) values ('d0000000-0000-0000-0000-0000000000a1','G1','home',100);
insert into goal_contributions(goal_id,amount) values ('d0000000-0000-0000-0000-0000000000a1',5);
insert into debts(id,name,kind,start_balance) values ('d0000000-0000-0000-0000-0000000000b1','D1','card',100);
insert into debt_payments(debt_id,amount) values ('d0000000-0000-0000-0000-0000000000b1',5);
set request.uid='d3d3d3d3-0000-0000-0000-0000000000d3';
insert into categories(id,name,kind) values ('keep-c1','Mantener','fixed');
insert into transactions(date,type,category_id,amount) values ('2026-11-01','fixed','keep-c1',77);
reset role;
-- D1 crea un hogar y D2 se une; D1 registra algo compartido
set role authenticated; set request.uid='d1d1d1d1-0000-0000-0000-0000000000d1';
create temp table hh as select create_household('Casa','es') as id;
create temp table hc as select invite_code as code from households where id=(select id from hh);
grant all on hc to public;
grant all on hh to public;
reset role;
set role authenticated; set request.uid='d2d2d2d2-0000-0000-0000-0000000000d2';
select join_household((select code from hc));
reset role;
set role authenticated; set request.uid='d1d1d1d1-0000-0000-0000-0000000000d1';
insert into transactions(household_id,date,type,category_id,amount) select (select id from hh),'2026-11-03','fixed',c.id,300 from categories c where c.household_id=(select id from hh) limit 1;
reset role;
-- anónimo no puede
set role anon; do $$ begin begin perform delete_my_account(); insert into delres values('anon no puede eliminar cuentas',false,'se permitió'); exception when others then insert into delres values('anon no puede eliminar cuentas',true,left(sqlerrm,50)); end; end $$; reset role;
-- D1 elimina su cuenta
set role authenticated; set request.uid='d1d1d1d1-0000-0000-0000-0000000000d1';
do $$ begin begin perform delete_my_account(); insert into delres values('D1 elimina su cuenta sin errores',true,''); exception when others then insert into delres values('D1 elimina su cuenta sin errores',false,sqlerrm); end; end $$;
reset role;
insert into delres select 'usuario borrado de auth', not exists(select 1 from auth.users where id='d1d1d1d1-0000-0000-0000-0000000000d1'),'';
insert into delres select 'perfil/plan/cuotas borrados', not exists(select 1 from profiles where user_id='d1d1d1d1-0000-0000-0000-0000000000d1') and not exists(select 1 from user_plans where user_id='d1d1d1d1-0000-0000-0000-0000000000d1') and not exists(select 1 from ai_usage where user_id='d1d1d1d1-0000-0000-0000-0000000000d1'),'';
insert into delres select 'datos personales borrados (categorías, movimientos, metas, aportes, deudas, pagos)', (select count(*) from categories where user_id='d1d1d1d1-0000-0000-0000-0000000000d1')=0 and (select count(*) from transactions where user_id='d1d1d1d1-0000-0000-0000-0000000000d1')=0 and (select count(*) from goals where user_id='d1d1d1d1-0000-0000-0000-0000000000d1')=0 and (select count(*) from goal_contributions where user_id='d1d1d1d1-0000-0000-0000-0000000000d1')=0 and (select count(*) from debts where user_id='d1d1d1d1-0000-0000-0000-0000000000d1')=0 and (select count(*) from debt_payments where user_id='d1d1d1d1-0000-0000-0000-0000000000d1')=0,'';
insert into delres select 'ningún rastro de D1 en ninguna tabla con user_id', (select count(*) from households where owner_id='d1d1d1d1-0000-0000-0000-0000000000d1')=0 and (select count(*) from household_members where user_id='d1d1d1d1-0000-0000-0000-0000000000d1')=0,'';
insert into delres select 'hogar sobrevive y pasa a D2 como dueño', (select owner_id from households where id=(select id from hh))='d2d2d2d2-0000-0000-0000-0000000000d2','';
insert into delres select 'movimiento compartido se conserva para D2', (select count(*) from transactions where household_id=(select id from hh) and user_id='d2d2d2d2-0000-0000-0000-0000000000d2' and amount=300)=1,'';
insert into delres select 'datos de otra persona (D3) intactos', (select count(*) from transactions where user_id='d3d3d3d3-0000-0000-0000-0000000000d3' and amount=77)=1 and exists(select 1 from categories where id='keep-c1'),'';
-- D2 (único miembro) elimina: el hogar desaparece
set role authenticated; set request.uid='d2d2d2d2-0000-0000-0000-0000000000d2';
do $$ begin begin perform delete_my_account(); insert into delres values('D2 (último miembro) elimina su cuenta',true,''); exception when others then insert into delres values('D2 (último miembro) elimina su cuenta',false,sqlerrm); end; end $$;
reset role;
insert into delres select 'hogar sin miembros desaparece', not exists(select 1 from households where id=(select id from hh)),'';
select case when ok then 'OK    ' else 'FALLA ' end||n||' ['||info||']' from delres order by ok,n;
