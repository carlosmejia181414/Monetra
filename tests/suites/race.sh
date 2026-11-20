#!/bin/bash
# $1 = tabla (goals|debts)
U=ffffffff-0000-0000-0000-0000000000f1
P="psql -p 5544 -U postgres -d qa2 -Atq"
$P -c "insert into auth.users(id,email) values ('$U','race@t.com') on conflict do nothing; delete from user_plans where user_id='$U'; delete from $1 where user_id='$U';"
for i in $(seq 1 20); do
 if [ "$1" = goals ]; then SQL="set role authenticated; set request.uid='$U'; insert into goals(name,icon,target_amount) values ('r$i','home',100);"
 else SQL="set role authenticated; set request.uid='$U'; insert into debts(name,kind,start_balance) values ('r$i','card',100);"; fi
 $P -c "$SQL" >/dev/null 2>&1 &
done; wait
$P -c "select '$1 creadas por Gratis (límite 2): '||count(*) from $1 where user_id='$U'"
