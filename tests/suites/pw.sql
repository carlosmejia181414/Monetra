\set k random(1,200)
select quote_literal(id::text) as uid from auth.users offset :k limit 1 \gset
begin;
set local role authenticated;
select set_config('request.uid', :uid, true);
insert into transactions(user_id,date,type,category_id,amount,description) select :uid::uuid, current_date, 'variable', id, 10, 'stress' from categories where user_id=:uid::uuid and kind='variable' limit 1;
commit;
