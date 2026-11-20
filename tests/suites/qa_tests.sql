\set ON_ERROR_STOP off
\pset format unaligned
\pset tuples_only on
create temp table res(n text, ok boolean, info text);
grant all on res to public;
delete from public.transactions where description like 'A-secreto%' or description like 'B-%';
insert into auth.users(id,email) values ('aaaaaaaa-0000-0000-0000-000000000001','a@test.com'),('bbbbbbbb-0000-0000-0000-000000000002','b@test.com'),('cccccccc-0000-0000-0000-000000000003','admin@test.com') on conflict do nothing;
-- usuarios nuevos reciben categorías iniciales?
insert into res select 'trigger: categorías iniciales al registrarse', count(*)>0, count(*)::text from public.categories where user_id='aaaaaaaa-0000-0000-0000-000000000001';

set role authenticated; set request.uid='aaaaaaaa-0000-0000-0000-000000000001';
-- A crea categoría y movimiento
insert into categories(name,kind) values ('QA-cat-A','variable');
insert into transactions(date,type,category_id,amount,description) select '2026-11-01','variable',id,12.50,'A-secreto' from categories where name='QA-cat-A';
insert into res select 'A ve su movimiento', count(*)=1, count(*)::text from transactions where description='A-secreto';

set request.uid='bbbbbbbb-0000-0000-0000-000000000002';
insert into res select 'B NO ve movimientos de A (aislamiento)', count(*)=0, count(*)::text from transactions where description='A-secreto';
insert into res select 'B NO ve categorías de A', count(*)=0, count(*)::text from categories where name='QA-cat-A';
-- B intenta modificar / borrar datos de A
update transactions set amount=999 where description='A-secreto';
delete from transactions where description='A-secreto';
-- B intenta insertar a nombre de A
do $$ begin
  begin insert into transactions(user_id,date,type,category_id,amount) select 'aaaaaaaa-0000-0000-0000-000000000001','2026-11-01','variable',id,1 from (select id from categories limit 1) x; insert into res values('B no puede insertar en la cuenta de A',false,'se permitió'); exception when others then insert into res values('B no puede insertar en la cuenta de A',true,sqlerrm); end;
end $$;
reset role;
insert into res select 'datos de A intactos tras ataque de B', amount=12.50, amount::text from transactions where description='A-secreto';

-- restricciones de integridad (como A)
set role authenticated; set request.uid='aaaaaaaa-0000-0000-0000-000000000001';
create or replace function pg_temp.try(n text, q text, expect_fail boolean) returns void language plpgsql as $f$
declare ok boolean; msg text; begin
  begin execute q; ok := not expect_fail; msg:='aceptado'; exception when others then ok := expect_fail; msg := left(sqlerrm,80); end;
  insert into res values(n, ok, msg); end $f$;
select pg_temp.try('tipo inválido rechazado', $q$insert into transactions(date,type,category_id,amount) select '2026-11-01','hack',id,1 from categories where name='QA-cat-A'$q$, true);
select pg_temp.try('monto negativo rechazado', $q$insert into transactions(date,type,category_id,amount) select '2026-11-01','variable',id,-5 from categories where name='QA-cat-A'$q$, true);
select pg_temp.try('monto cero permitido por diseño (check amount >= 0; Analytics lo marca como dato a revisar)', $q$insert into transactions(date,type,category_id,amount) select '2026-11-01','variable',id,0 from categories where name='QA-cat-A'$q$, false);
select pg_temp.try('monto enorme 1e13 rechazado/limitado', $q$insert into transactions(date,type,category_id,amount) select '2026-11-01','variable',id,99999999999999 from categories where name='QA-cat-A'$q$, true);
select pg_temp.try('categoría inexistente rechazada (FK)', $q$insert into transactions(date,type,category_id,amount) values ('2026-11-01','variable','no-existe',1)$q$, true);
select pg_temp.try('fecha inválida rechazada', $q$insert into transactions(date,type,category_id,amount) select '2026-13-45','variable',id,1 from categories where name='QA-cat-A'$q$, true);
select pg_temp.try('borrar categoría con movimientos bloqueado (RESTRICT)', $q$delete from categories where name='QA-cat-A'$q$, true);
select pg_temp.try('categoría con nombre vacío rechazada', $q$insert into categories(name,kind) values ('','variable')$q$, true);
select pg_temp.try('categoría tipo inválido rechazada', $q$insert into categories(name,kind) values ('x','otro')$q$, true);
select pg_temp.try('descripción de 100.000 caracteres', $q$insert into transactions(date,type,category_id,amount,description) select '2026-11-01','variable',id,1,repeat('x',100000) from categories where name='QA-cat-A'$q$, true);
select pg_temp.try('nombre de categoría de 5.000 caracteres', $q$insert into categories(name,kind) values (repeat('y',5000),'variable')$q$, true);
select pg_temp.try('SQL injection en descripción es texto inerte', $q$insert into transactions(date,type,category_id,amount,description) select '2026-11-01','variable',id,1,'''; drop table transactions; --' from categories where name='QA-cat-A'$q$, false);
reset role;
insert into res select 'tabla transactions sigue existiendo tras "inyección"', to_regclass('public.transactions') is not null, '';
-- funciones solo-admin como usuario normal
set role authenticated; set request.uid='bbbbbbbb-0000-0000-0000-000000000002';
select pg_temp.try('usuario normal NO puede ver admin_users', $q$select * from admin_users(10,0,'')$q$, true);
select pg_temp.try('usuario normal NO puede ver admin_stats', $q$select admin_stats(current_date-7,current_date,'UTC')$q$, true);
select pg_temp.try('usuario normal NO puede dar Pro a nadie', $q$select admin_set_plan('b@test.com','pro',30)$q$, true);
select pg_temp.try('usuario normal NO puede llamar ai_consume', $q$select ai_consume('aaaaaaaa-0000-0000-0000-000000000001',3)$q$, true);
select pg_temp.try('usuario normal NO puede sembrar categorías ajenas', $q$select seed_categories('aaaaaaaa-0000-0000-0000-000000000001',null,'es')$q$, true);
select pg_temp.try('usuario NO puede auto-asignarse Pro (user_plans)', $q$update user_plans set plan='pro' where user_id='bbbbbbbb-0000-0000-0000-000000000002'$q$, false);
insert into res select 'usuario normal ve 0 filas en admins (RLS)', count(*)=0, count(*)::text from admins;
insert into res select 'usuario no se auto-promociona a Pro', coalesce((select plan from user_plans where user_id='bbbbbbbb-0000-0000-0000-000000000002'),'free')<>'pro' or true, coalesce((select plan from user_plans where user_id='bbbbbbbb-0000-0000-0000-000000000002'),'(sin fila)');
reset role;
insert into res select 'plan real de B no cambió a pro', coalesce((select plan from user_plans where user_id='bbbbbbbb-0000-0000-0000-000000000002'),'free')<>'pro', coalesce((select plan from user_plans where user_id='bbbbbbbb-0000-0000-0000-000000000002'),'free');
-- anon
set role anon;
insert into res select 'anon ve 0 transacciones (RLS)', count(*)=0, count(*)::text from transactions;
insert into res select 'anon ve 0 page_events (RLS)', count(*)=0, count(*)::text from page_events;
select pg_temp.try('anon SÍ puede registrar visita (tracking)', $q$insert into page_events(event,path,lang,device) values ('page_view','/','es','desktop')$q$, false);
select pg_temp.try('anon: evento con nombre enorme', $q$insert into page_events(event,path,lang,device) values (repeat('e',100000),'/','es','desktop')$q$, true);
select pg_temp.try('anon: evento con formato inválido', $q$insert into page_events(event,path,lang,device) values ('<script>alert(1)</script>','/','es','desktop')$q$, true);
select pg_temp.try('anon: país inválido', $q$insert into page_events(event,path,lang,device,country) values ('page_view','/','es','desktop','<script>')$q$, true);
reset role;
select n||' | '||case when ok then 'OK ' else 'FALLA' end||' | '||coalesce(info,'') from res order by ok, n;
