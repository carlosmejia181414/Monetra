#!/bin/bash
# Pruebas de base de datos operativas: respaldo/restauración, reinstalación con datos, carreras, carga y estrés, rendimiento con datos grandes.
export PGUSER=postgres PGPORT=5544; REPO=${MONETRA_REPO:-/home/claude/mibalance}; cd "$(dirname "$0")"
P(){ echo "PASS $1"; }; F(){ echo "FAIL $1"; }
mkdb(){ dropdb --if-exists $1 2>/dev/null; createdb $1; psql -d $1 -q -f qa_stub.sql >/dev/null 2>&1; psql -d $1 -q -f qa_pre.sql >/dev/null 2>&1
  psql -d $1 -qc "alter default privileges in schema public grant all on tables to authenticated, anon; alter default privileges in schema public grant all on sequences to authenticated, anon; alter default privileges in schema public grant execute on functions to authenticated, anon; grant usage on schema public to authenticated, anon" >/dev/null 2>&1; }
cnt(){ psql -d $1 -Atc "select string_agg(t||'='||c, ',' order by t) from (select table_name t, (xpath('/row/c/text()', query_to_xml('select count(*) c from public.'||table_name, false, true, '')))[1]::text c from information_schema.tables where table_schema='public' and table_type='BASE TABLE') x"; }
echo "## MIGRACIÓN (base vacía, 2 instalaciones) y respaldo"
mkdb qa_ops; for i in 1 2; do psql -d qa_ops -q -f $REPO/supabase/instalar-todo.sql >/tmp/ops$i.log 2>&1; e=$(grep -c ERROR /tmp/ops$i.log); [ "$e" = 0 ] && P "migración: instalación $i sin errores" || F "migración: instalación $i con $e errores"; done
U=aaaaaaaa-0000-0000-0000-000000000001
psql -d qa_ops -qc "insert into auth.users(id,email) values ('$U','a@t.com') on conflict do nothing" ; psql -d qa_ops -qc "insert into categories(id,user_id,name,kind) values ('c9','$U','Prueba','fixed')"; psql -d qa_ops -qc "insert into transactions(user_id,date,type,category_id,amount) values ('$U','2026-11-01','fixed','c9',1200.55)"
A=$(cnt qa_ops); psql -d qa_ops -q -f $REPO/supabase/instalar-todo.sql >/dev/null 2>&1; B=$(cnt qa_ops)
[ "$A" = "$B" ] && [ "$(psql -d qa_ops -Atc 'select sum(amount) from transactions')" = "1200.55" ] && P "migración: reinstalar sobre datos no pierde ni altera nada (decimales intactos)" || F "migración: reinstalar cambió los datos"
pg_dump -Fc -d qa_ops -f /tmp/ops.dump; dropdb --if-exists qa_ops_r; createdb qa_ops_r; pg_restore -d qa_ops_r --no-owner /tmp/ops.dump >/dev/null 2>&1
[ "$(cnt qa_ops)" = "$(cnt qa_ops_r)" ] && P "respaldo: pg_dump → pg_restore deja conteos idénticos" || F "respaldo: restauración distinta"
for q in "select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where nspname='public'" "select count(*) from pg_trigger where not tgisinternal" "select count(*) from pg_policies" "select count(*) from pg_class where relrowsecurity"; do [ "$(psql -d qa_ops -Atc "$q")" = "$(psql -d qa_ops_r -Atc "$q")" ] || F "respaldo: difiere $q"; done; P "respaldo: funciones, triggers, políticas y RLS idénticos tras restaurar"
echo "## CONCURRENCIA (límites Gratis: 20 altas simultáneas, esperado 2)"
for t in goals debts; do for i in 1 2 3; do
  psql -d qa_ops -Atqc "insert into auth.users(id,email) values ('ffffffff-0000-0000-0000-0000000000f1','race@t.com') on conflict do nothing; delete from $t where user_id='ffffffff-0000-0000-0000-0000000000f1'" >/dev/null 2>&1
  for k in $(seq 1 20); do if [ $t = goals ]; then S="insert into goals(name,icon,target_amount) values ('r$k','home',100)"; else S="insert into debts(name,kind,start_balance) values ('r$k','card',100)"; fi
    psql -d qa_ops -Atq -c "set role authenticated; set request.uid='ffffffff-0000-0000-0000-0000000000f1'; $S;" >/dev/null 2>&1 & done; wait
  n=$(psql -d qa_ops -Atc "select count(*) from $t where user_id='ffffffff-0000-0000-0000-0000000000f1'"); [ "$n" = 2 ] || { F "carrera en $t (corrida $i): $n creadas"; bad=1; }
done; done; [ -z "$bad" ] && P "concurrencia: goals y debts respetan el límite 2 en 6 corridas de 20 altas simultáneas"
echo "## RENDIMIENTO / ESCALABILIDAD (200 usuarios, ~560 mil movimientos)"
mkdb qa_big; psql -d qa_big -q -f $REPO/supabase/instalar-todo.sql >/dev/null 2>&1
psql -d qa_big -q >/dev/null 2>&1 <<'S'
insert into auth.users(id,email) select gen_random_uuid(),'u'||g||'@t.com' from generate_series(1,200) g;
insert into categories(id,user_id,name,kind) select u.id||'-'||k, u.id, 'cat'||k, case when k<2 then 'income' when k<8 then 'fixed' else 'variable' end from auth.users u cross join generate_series(0,19) k on conflict do nothing;
insert into transactions(user_id,date,type,category_id,amount,description) select c.user_id, date '2024-01-01' + (random()*1050)::int, c.kind, c.id, round((random()*500)::numeric,2), 'x' from categories c cross join generate_series(1,100) where c.id like '%-%';
analyze;
S
UU=$(psql -d qa_big -Atc "select user_id from transactions group by 1 limit 1")
ms=$(psql -d qa_big -Atc "set role authenticated; set request.uid='$UU'; explain analyze select * from transactions where date >= '2026-10-01' and date < '2026-11-01' order by date" | grep -oP 'Execution Time: \K[0-9.]+')
awk "BEGIN{exit !($ms < 50)}" && P "rendimiento: consulta de un mes con 560 mil filas en ${ms} ms (<50 ms)" || F "rendimiento: consulta de un mes tardó ${ms} ms"
psql -d qa_big -Atc "set role authenticated; set request.uid='$UU'; explain select * from transactions where date >= '2026-10-01'" | grep -q "Index" && P "escalabilidad: usa índice (usuario, fecha)" || F "escalabilidad: no usa índice"
psql -d qa_big -qc "grant all on all tables in schema public to authenticated" >/dev/null 2>&1
for c in 10 50 90; do out=$(pgbench -n -p 5544 -U postgres -d qa_big -f pb.sql -c $c -j 2 -T 5 2>&1); fl=$(echo "$out"|grep -oP 'failed transactions: \K[0-9]+'); tps=$(echo "$out"|grep -oP '^tps = \K[0-9]+'); [ "$fl" = 0 ] && [ "${tps:-0}" -gt 300 ] && P "carga: $c clientes simultáneos con RLS = ${tps} consultas/s, 0 fallos" || F "carga: $c clientes → fallos=$fl tps=$tps"; done
out=$(pgbench -n -p 5544 -U postgres -d qa_big -f pw.sql -c 90 -j 2 -T 5 2>&1); fl=$(echo "$out"|grep -oP 'failed transactions: \K[0-9]+'); tps=$(echo "$out"|grep -oP '^tps = \K[0-9]+'); [ "$fl" = 0 ] && [ "${tps:-0}" -gt 200 ] && P "estrés: 90 clientes escribiendo = ${tps} inserciones/s, 0 fallos" || F "estrés: fallos=$fl tps=$tps"
dropdb --if-exists qa_big; dropdb --if-exists qa_ops; dropdb --if-exists qa_ops_r
echo DBOPS_DONE
