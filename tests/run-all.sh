#!/bin/bash
# ============================================================
#  Monetra — EJECUTAR TEST: corre TODAS las pruebas acumuladas del proyecto
#  Uso:   ./tests/run-all.sh            (completo, ~12 min)
#         ./tests/run-all.sh rapido     (omite carga/estrés, rendimiento, accesibilidad axe, resistencia; ~4 min)
#  Opcional (IA con modelo real): SUPABASE_URL=... ANON_KEY=... USER_JWT=... ./tests/run-all.sh
#  Resultado: tabla en pantalla + tests/ULTIMO-INFORME.md. Código de salida 0 = todo aprobado.
# ============================================================
HERE="$(cd "$(dirname "$0")" && pwd)"; export MONETRA_REPO="$(dirname "$HERE")"; REPO="$MONETRA_REPO"
MODE="${1:-completo}"; WORK=/tmp/t; OUT=/tmp/t/out; mkdir -p $WORK $OUT $WORK/deno
export PGUSER=postgres PGPORT=5544
T0=$(date +%s)
echo "== Preparando entorno ($MODE)"
# 1) copiar pruebas al directorio de trabajo apuntando al repositorio actual
cp -r "$HERE/suites/"* $WORK/ 2>/dev/null; cp "$HERE/suites/deno/"* $WORK/deno/ 2>/dev/null; rm -rf $WORK/deno/deno
for f in $WORK/*.py $WORK/*.js $WORK/*.sql $WORK/*.sh $WORK/deno/*.ts; do [ -f "$f" ] && sed -i "s#/home/claude/mibalance#$REPO#g" "$f"; done
chmod +x $WORK/*.sh
# 2) PostgreSQL local
if ! psql -p 5544 -U postgres -d postgres -Atc "select 1" >/dev/null 2>&1; then
  if [ ! -d /tmp/pgd ]; then mkdir -p /tmp/pgd && chown postgres /tmp/pgd && su postgres -c "/usr/lib/postgresql/16/bin/initdb -D /tmp/pgd" >/dev/null 2>&1; fi
  rm -f /tmp/pgd/postmaster.pid; su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /tmp/pgd -o '-p 5544' -l /tmp/pg.log start -w" >/dev/null 2>&1
fi
psql -p 5544 -U postgres -d postgres -Atc "select 1" >/dev/null 2>&1 || { echo "ERROR: no pude iniciar PostgreSQL 16 (se necesita en /usr/lib/postgresql/16)"; exit 2; }
# 3) herramientas: axe-core y Deno
[ -d $WORK/ax/node_modules/axe-core ] || (mkdir -p $WORK/ax && cd $WORK/ax && npm i axe-core >/dev/null 2>&1)
[ -x $WORK/deno/node_modules/.bin/deno ] || (cd $WORK/deno && npm i deno @supabase/supabase-js@2.119.1 >/dev/null 2>&1)
# 4) base limpia 'qa2' con instalar-todo.sql dos veces
cd $WORK; dropdb --if-exists qa2 2>/dev/null; createdb qa2; psql -d qa2 -q -f qa_stub.sql >/dev/null 2>&1; psql -d qa2 -q -f qa_pre.sql >/dev/null 2>&1
psql -d qa2 -qc "alter default privileges in schema public grant all on tables to authenticated, anon; alter default privileges in schema public grant all on sequences to authenticated, anon; alter default privileges in schema public grant execute on functions to authenticated, anon; grant usage on schema public to authenticated, anon" >/dev/null 2>&1
for i in 1 2; do psql -d qa2 -q -f $REPO/supabase/instalar-todo.sql >$OUT/install$i.log 2>&1; done
INSTERR=$(cat $OUT/install1.log $OUT/install2.log | grep -c ERROR)
# 5) zip de instalación para la prueba de instalación
rm -rf /tmp/inst /tmp/monetra-test.zip; (cd "$REPO" && zip -rq /tmp/monetra-test.zip . -x "www/config.js" ".git/*" "tests/*" "node_modules/*") ; mkdir -p /tmp/inst && (cd /tmp/inst && unzip -q /tmp/monetra-test.zip && cp www/config.example.js www/config.js)

declare -a NAMES RES PASSN FAILN NOTES
add(){ NAMES+=("$1"); RES+=("$2"); PASSN+=("$3"); FAILN+=("$4"); NOTES+=("$5"); printf "%-58s %-6s  ok=%-4s fallas=%-3s %s\n" "$1" "$2" "$3" "$4" "$5"; }
# evalúa un log: cuenta PASS/OK y FAIL/FALLA
judge(){ # nombre log [info]
  local n="$1" lg="$2" info="$3"
  local p f; p=$(grep -cE '^(PASS|OK )' "$lg"); f=$(grep -cE '^(FAIL|FALLA) |Traceback|STATIC FALLAS|FALLAS \[.+\]|FAILS:? \[.+\]|^ERR |PAGEERR' "$lg")
  if [ "$info" = info ]; then add "$n" "INFO" "-" "-" "informativo"; return; fi
  if [ "$f" -gt 0 ]; then add "$n" "FALLA" "$p" "$f" "ver $lg"; elif [ "$p" -eq 0 ]; then add "$n" "FALLA" 0 "?" "sin resultados: ver $lg"; else add "$n" "OK" "$p" 0 ""; fi
}
echo "== Ejecutando"
[ "$INSTERR" = 0 ] && add "Migración: instalar-todo.sql x2 en base limpia" OK 2 0 "" || add "Migración: instalar-todo.sql x2 en base limpia" FALLA 0 "$INSTERR" "ver $OUT/install*.log"
run(){ local n="$1"; shift; local lg="$OUT/$(echo "$n" | tr -c 'A-Za-z0-9' _).log"; "$@" >"$lg" 2>&1; judge "$n" "$lg"; }
runinfo(){ local n="$1"; shift; local lg="$OUT/$(echo "$n" | tr -c 'A-Za-z0-9' _).log"; "$@" >"$lg" 2>&1; judge "$n" "$lg" info; }
run "Estático: secretos, SAST, SEO, CSP, privacidad, PWA retirada" python3 $WORK/static_checks.py
run "Matemática de deudas (avalancha/bola de nieve)" node $WORK/debtmath_t.js
for t in "t8:Funcional: movimientos, categorías, perfil, hogar" "mb:Móvil: barra inferior, menú, responsive base" "an:Análisis y gráficas" "pl:Planes Gratis/Pro y límites" "e2e:E2E: flujos completos, importar/exportar, errores" "xss:Seguridad XSS básica" "xss2:Seguridad XSS ampliada (9 pantallas, safe.js apagado)" "csp_t:Seguridad CSP sin violaciones" "priv_t:Privacidad: páginas legales y eliminar cuenta" "goals_t:Metas de ahorro" "guide_t:Guía de IA (chat en el panel)" "debts_t:Deudas" ; do
  s="${t%%:*}"; n="${t#*:}"; run "$n" timeout 290 python3 $WORK/$s.py
done
run "UI: tema claro/oscuro y accesibilidad base" timeout 290 python3 $WORK/ui.py
runinfo "i18n: textos sin traducir (falsos positivos conocidos: 3)" timeout 290 python3 $WORK/i18n_scan.py
if [ "$MODE" != rapido ]; then
  run "Navegador: responsive 7 anchos, teclado, sin red, memoria" timeout 295 python3 $WORK/br_all.py
  runinfo "Rendimiento web (4G lenta + CPU 4x)" timeout 200 python3 $WORK/perf.py
  lg=$OUT/axe.log; timeout 500 python3 $WORK/ax3.py >$lg 2>&1; if grep -qE '[1-9][0-9]* problemas' $lg; then add "Accesibilidad axe: 6 combinaciones tema/idioma" FALLA 0 "$(grep -cE '[1-9][0-9]* problemas' $lg)" "ver $lg"; else add "Accesibilidad axe: 6 combinaciones tema/idioma" OK "$(grep -c ' 0 problemas' $lg)" 0 ""; fi
fi
run "Instalación desde el zip (6 archivos 200, sin errores JS)" bash -c "python3 $WORK/inst.py | sed -E 's/^(index|app|admin|diagnostico)\.html 200\$/PASS \0/; s/^(robots\.txt|sitemap\.xml) 200\$/PASS \0/; s/^recursos con error: ninguno\$/PASS sin recursos rotos/; s/^errores JS: ninguno\$/PASS sin errores JS/'"
for f in qa_tests:"SQL funcional/RLS/planes" qa_hh:"SQL hogar compartido" qa_goals:"SQL metas" qa_debts:"SQL deudas" sec_db:"Seguridad SQL: IDOR/BOLA/escalada/anon (45 ataques)" sec_del:"Privacidad SQL: eliminar cuenta y hogar"; do
  s="${f%%:*}"; n="${f#*:}"; lg="$OUT/$s.log"; psql -d qa2 -f $WORK/$s.sql 2>&1 | grep -E "OK|FALLA" >"$lg"; ok=$(grep -c "OK" "$lg"); bad=$(grep -c "FALLA" "$lg"); [ "$bad" = 0 ] && [ "$ok" -gt 0 ] && add "$n" OK "$ok" 0 "" || add "$n" FALLA "$ok" "$bad" "ver $lg"
done
(cd $WORK/deno && for t in api_t:"API: 5 Edge Functions (contrato, límites, errores)" ai_t:"IA: inyección, fuga, salida, fuzz 1500, carga 200"; do
  s="${t%%:*}"; n="${t#*:}"; lg="$OUT/$s.log"; timeout 200 node_modules/.bin/deno run --allow-all --minimum-dependency-age=0 --import-map=import_map.json --node-modules-dir=auto $s.ts >"$lg" 2>&1; judge "$n" "$lg"
done) 2>/dev/null | sed 's/^/  /' >/dev/null
# (judge dentro de subshell no actualiza arrays: reevaluar fuera)
for t in api_t:"API: 5 Edge Functions (contrato, límites, errores)" ai_t:"IA: inyección, fuga, salida, fuzz 1500, carga 200"; do s="${t%%:*}"; n="${t#*:}"; judge "$n" "$OUT/$s.log"; done
if [ "$MODE" != rapido ]; then
  lg=$OUT/dbops.log; timeout 400 $WORK/db_ops.sh >$lg 2>&1; judge "BD: migración, respaldo/restauración, carreras, carga, estrés, escala" "$lg"
fi
if [ -n "$SUPABASE_URL" ] && [ -n "$ANON_KEY" ]; then (cd "$HERE/../tests/ai-eval" 2>/dev/null || cd "$REPO/tests/ai-eval"; node run-eval.mjs auto >$OUT/ai_eval.log 2>&1); judge "IA real: precisión, alucinación, inyección, sesgo (modelo)" "$OUT/ai_eval.log"; else add "IA real (modelo): precisión, alucinación, sesgo, deriva" OMITIDA - - "requiere SUPABASE_URL, ANON_KEY y USER_JWT"; fi

# ---- informe
TOT_OK=0; TOT_F=0; BADS=0
{ echo "# Monetra — Último informe de pruebas"; echo; echo "Fecha: $(date '+%Y-%m-%d %H:%M') · Modo: $MODE · Duración: $(( ($(date +%s)-T0)/60 )) min"; echo; echo "| Resultado | Suite | OK | Fallas | Nota |"; echo "|---|---|---|---|---|"
for i in "${!NAMES[@]}"; do r="${RES[$i]}"; [ "$r" = FALLA ] && BADS=$((BADS+1)); [[ "${PASSN[$i]}" =~ ^[0-9]+$ ]] && TOT_OK=$((TOT_OK+PASSN[$i])); echo "| $r | ${NAMES[$i]} | ${PASSN[$i]} | ${FAILN[$i]} | ${NOTES[$i]} |"; done
echo; echo "**Total comprobaciones aprobadas: $TOT_OK · Suites con fallas: $BADS**"; } > "$HERE/ULTIMO-INFORME.md"
echo; echo "============================================================"; echo " Comprobaciones aprobadas: $TOT_OK · Suites con fallas: $BADS"; [ $BADS = 0 ] && echo " RESULTADO: TODO APROBADO" || echo " RESULTADO: HAY FALLAS (ver tests/ULTIMO-INFORME.md y $OUT/)"; echo " Informe: $HERE/ULTIMO-INFORME.md"; echo "============================================================"
exit $BADS
