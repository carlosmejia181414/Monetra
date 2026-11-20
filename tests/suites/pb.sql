\set k random(1,200)
select quote_literal(id::text) as uid from auth.users offset :k limit 1 \gset
begin;
set local role authenticated;
select set_config('request.uid', :uid, true);
select category_id, sum(amount) from transactions where date >= '2026-10-01' and date < '2026-11-01' group by 1;
commit;
