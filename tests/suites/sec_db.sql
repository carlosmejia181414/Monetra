\set ON_ERROR_STOP off
\pset format unaligned
\pset tuples_only on
create table if not exists secres(n text, ok boolean, info text);
truncate secres; grant all on secres to public;
insert into auth.users(id,email) values ('a1a1a1a1-0000-0000-0000-00000000000a','alice@t.com'),('b2b2b2b2-0000-0000-0000-00000000000b','bob@t.com') on conflict do nothing;
delete from goals where user_id in ('a1a1a1a1-0000-0000-0000-00000000000a','b2b2b2b2-0000-0000-0000-00000000000b');
delete from debts where user_id in ('a1a1a1a1-0000-0000-0000-00000000000a','b2b2b2b2-0000-0000-0000-00000000000b');
delete from user_plans where user_id in ('a1a1a1a1-0000-0000-0000-00000000000a','b2b2b2b2-0000-0000-0000-00000000000b');
-- Alice crea datos
set role authenticated; set request.uid='a1a1a1a1-0000-0000-0000-00000000000a';
insert into categories(id,name,kind) values ('sec-cat-a','SecretaA','fixed');
insert into transactions(id,date,type,category_id,amount,description) values ('sec-tx-a','2026-11-01','fixed','sec-cat-a',99,'privado A');
insert into goals(id,name,icon,target_amount) values ('a0000000-0000-0000-0000-0000000000a1','MetaA','home',1000);
insert into goal_contributions(goal_id,amount) values ('a0000000-0000-0000-0000-0000000000a1',50);
insert into debts(id,name,kind,start_balance) values ('a0000000-0000-0000-0000-0000000000d1','DeudaA','card',500);
insert into debt_payments(debt_id,amount) values ('a0000000-0000-0000-0000-0000000000d1',20);
reset role;
-- Bob ataca
set role authenticated; set request.uid='b2b2b2b2-0000-0000-0000-00000000000b';
create or replace function pg_temp.t(n text, q text, expect_rows int default null, expect_err boolean default false) returns void language plpgsql as $f$
declare c int; begin
  begin execute q; get diagnostics c = row_count;
    if expect_err then insert into secres values(n,false,'se permitió ('||c||' filas)'); else insert into secres values(n, coalesce(c=expect_rows,true), c||' filas'); end if;
  exception when others then insert into secres values(n, expect_err, left(sqlerrm,70)); end; end $f$;
select pg_temp.t('IDOR: Bob lee movimientos de Alice',$$select * from transactions where id='sec-tx-a'$$,0);
select pg_temp.t('IDOR: Bob lee categorías de Alice',$$select * from categories where id='sec-cat-a'$$,0);
select pg_temp.t('IDOR: Bob lee metas de Alice',$$select * from goals$$,0);
select pg_temp.t('IDOR: Bob lee aportes de Alice',$$select * from goal_contributions$$,0);
select pg_temp.t('IDOR: Bob lee deudas de Alice',$$select * from debts$$,0);
select pg_temp.t('IDOR: Bob lee pagos de Alice',$$select * from debt_payments$$,0);
select pg_temp.t('IDOR: Bob modifica movimiento de Alice',$$update transactions set amount=1 where id='sec-tx-a'$$,0);
select pg_temp.t('IDOR: Bob borra movimiento de Alice',$$delete from transactions where id='sec-tx-a'$$,0);
select pg_temp.t('IDOR: Bob borra meta de Alice',$$delete from goals$$,0);
select pg_temp.t('IDOR: Bob borra deuda de Alice',$$delete from debts$$,0);
select pg_temp.t('BOLA: Bob aporta a meta de Alice',$$insert into goal_contributions(goal_id,amount) values ('a0000000-0000-0000-0000-0000000000a1',1)$$,null,true);
select pg_temp.t('BOLA: Bob paga deuda de Alice',$$insert into debt_payments(debt_id,amount) values ('a0000000-0000-0000-0000-0000000000d1',1)$$,null,true);
select pg_temp.t('BOLA: Bob usa categoría de Alice en su movimiento',$$insert into transactions(date,type,category_id,amount) values ('2026-11-01','fixed','sec-cat-a',1)$$,null,true);
select pg_temp.t('Suplantación: insertar movimiento con user_id de Alice',$$insert into categories(id,user_id,name,kind) values ('x1','a1a1a1a1-0000-0000-0000-00000000000a','Hack','fixed')$$,null,true);
insert into categories(id,name,kind) values ('sec-cat-b','CatB','fixed');
select pg_temp.t('Mass assignment: Bob cambia user_id de su categoría a Alice',$$update categories set user_id='a1a1a1a1-0000-0000-0000-00000000000a' where id='sec-cat-b'$$,null,true);
select pg_temp.t('Mass assignment: Bob se inyecta household_id ajeno',$$update categories set household_id=gen_random_uuid() where id='sec-cat-b'$$,null,true);
insert into goals(id,name,icon,target_amount) values ('b0000000-0000-0000-0000-0000000000b1','MetaB','home',100);
select pg_temp.t('Mass assignment: Bob traspasa su meta a Alice',$$update goals set user_id='a1a1a1a1-0000-0000-0000-00000000000a'$$,null,true);
-- Escalada de plan / admin
select pg_temp.t('Plan: Bob se pone Pro (insert user_plans)',$$insert into user_plans(user_id,plan) values ('b2b2b2b2-0000-0000-0000-00000000000b','pro')$$,null,true);
select pg_temp.t('Plan: Bob edita user_plans',$$update user_plans set plan='pro'$$,0);
select pg_temp.t('Plan: Bob lee user_plans de otros',$$select * from user_plans$$,0);
select pg_temp.t('Admin: Bob se agrega a admins',$$insert into admins(user_id) values ('b2b2b2b2-0000-0000-0000-00000000000b')$$,null,true);
select pg_temp.t('Admin: Bob llama admin_users()',$$select * from admin_users(10,0,'')$$,null,true);
select pg_temp.t('Admin: Bob llama admin_stats()',$$select * from admin_stats(current_date-7,current_date,'UTC')$$,null,true);
select pg_temp.t('Admin: Bob llama admin_set_plan() para sí mismo',$$select admin_set_plan('bob@t.com','pro',30)$$,null,true);
select pg_temp.t('Admin: Bob lee page_events',$$select * from page_events$$,0);
select pg_temp.t('Cuotas: Bob llama ai_consume(otro usuario)',$$select ai_consume('a1a1a1a1-0000-0000-0000-00000000000a',1)$$,null,true);
select pg_temp.t('Cuotas: Bob llama guide_consume',$$select guide_consume('a1a1a1a1-0000-0000-0000-00000000000a',1)$$,null,true);
select pg_temp.t('Cuotas: Bob llama scan_refund (regalarse cupo)',$$select scan_refund('b2b2b2b2-0000-0000-0000-00000000000b')$$,null,true);
select pg_temp.t('Datos: Bob llama plan_of(Alice)',$$select plan_of('a1a1a1a1-0000-0000-0000-00000000000a')$$,null,true);
select pg_temp.t('Cuotas: Bob edita ai_usage',$$update ai_usage set count=0$$,0);
select pg_temp.t('Cuotas: Bob borra scan_usage',$$delete from scan_usage$$,0);
select pg_temp.t('Perfil: Bob lee perfil de Alice',$$select * from profiles where user_id='a1a1a1a1-0000-0000-0000-00000000000a'$$,0);
select pg_temp.t('Hogar: Bob se une con código inventado',$$select join_household('ZZZZZZ')$$,null,true);
select pg_temp.t('Hogar: Bob lee hogares ajenos',$$select * from households$$,0);
select pg_temp.t('Hogar: Bob se inserta como miembro directo',$$insert into household_members(household_id,user_id) values (gen_random_uuid(),'b2b2b2b2-0000-0000-0000-00000000000b')$$,null,true);
reset role;
-- anon
set role anon;
select pg_temp.t('anon: lee movimientos',$$select * from transactions$$,0);
select pg_temp.t('anon: lee categorías',$$select * from categories$$,0);
select pg_temp.t('anon: lee metas',$$select * from goals$$,0);
select pg_temp.t('anon: lee user_plans',$$select * from user_plans$$,0);
select pg_temp.t('anon: lee page_events',$$select * from page_events$$,0);
select pg_temp.t('anon: lee profiles',$$select * from profiles$$,0);
select pg_temp.t('anon: inserta movimiento',$$insert into transactions(user_id,date,type,category_id,amount) values ('a1a1a1a1-0000-0000-0000-00000000000a','2026-11-01','fixed','sec-cat-a',1)$$,null,true);
select pg_temp.t('anon: llama admin_users',$$select * from admin_users(1,0,'')$$,null,true);
select pg_temp.t('anon: llama create_household',$$select create_household('x','es')$$,null,true);
reset role;
-- Alice sigue intacta
set role authenticated; set request.uid='a1a1a1a1-0000-0000-0000-00000000000a';
insert into secres select 'Integridad: datos de Alice intactos tras los ataques', (select amount from transactions where id='sec-tx-a')=99 and (select count(*) from goals)=1 and (select count(*) from debts)=1 and (select sum(amount) from goal_contributions)=50, 'ok';
reset role;
select case when ok then 'OK    ' else 'FALLA ' end||n||' ['||info||']' from secres order by ok, n;
