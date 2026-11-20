\pset tuples_only on
create temp table r2(n text, ok boolean, info text); grant all on r2 to public;
insert into auth.users(id,email) values ('aaaaaaaa-0000-0000-0000-000000000001','a@test.com'),('bbbbbbbb-0000-0000-0000-000000000002','b@test.com'),('eeeeeeee-0000-0000-0000-000000000005','e@test.com') on conflict do nothing;
update user_plans set plan='pro', source='admin' where user_id='aaaaaaaa-0000-0000-0000-000000000001';
insert into user_plans(user_id,plan,source) values('aaaaaaaa-0000-0000-0000-000000000001','pro','admin') on conflict (user_id) do update set plan='pro',source='admin';
delete from public.transactions where description='hogar-compartido';
set role authenticated; set request.uid='aaaaaaaa-0000-0000-0000-000000000001';
select create_household('Casa QA','es') \gset hh_
insert into r2 select 'Pro crea hogar', count(*)=1, count(*)::text from households where name='Casa QA';
insert into transactions(date,type,category_id,amount,description,household_id) select '2026-11-02','variable',c.id,50,'hogar-compartido',h.id from households h join categories c on c.household_id=h.id where h.name='Casa QA' limit 1;
create temp table code as select invite_code c from households where name='Casa QA';
grant all on code to public;
set request.uid='bbbbbbbb-0000-0000-0000-000000000002';
insert into r2 select 'No miembro NO ve movimientos del hogar', count(*)=0, count(*)::text from transactions where description='hogar-compartido';
insert into r2 select 'No miembro NO ve el hogar', count(*)=0, count(*)::text from households;
do $$ begin begin perform join_household('CODIGOFALSO'); insert into r2 values('código falso rechazado',false,'aceptó'); exception when others then insert into r2 values('código falso rechazado',true,sqlerrm); end; end $$;
do $$ begin begin perform create_household('Casa B','es'); insert into r2 values('usuario Free NO puede crear hogar',false,'aceptó'); exception when others then insert into r2 values('usuario Free NO puede crear hogar',true,sqlerrm); end; end $$;
select join_household((select c from code)) \gset j_
insert into r2 select 'Con código válido se une y ve movimientos', count(*)=1, count(*)::text from transactions where description='hogar-compartido';
set request.uid='eeeeeeee-0000-0000-0000-000000000005';
insert into r2 select 'Tercero ajeno sigue sin ver nada', count(*)=0, count(*)::text from transactions where description='hogar-compartido';
set request.uid='bbbbbbbb-0000-0000-0000-000000000002';
select leave_household();
insert into r2 select 'Tras salir ya no ve movimientos del hogar', count(*)=0, count(*)::text from transactions where description='hogar-compartido';
reset role;
select n||' | '||case when ok then 'OK ' else 'FALLA' end||' | '||coalesce(info,'') from r2;
