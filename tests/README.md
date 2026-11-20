# Pruebas de Monetra

```
./tests/run-all.sh          # TODO (≈12 min)  ← lo que se ejecuta cuando dices "ejecutar test"
./tests/run-all.sh rapido   # sin carga/estrés/rendimiento/axe (≈4 min)
```
Requisitos: Linux con PostgreSQL 16, Node 18+, Python 3 con Playwright (Chromium) y `pyyaml`, `npm`. El ejecutor prepara solo la base de datos de prueba, axe-core y Deno.
Resultado: tabla en pantalla y `tests/ULTIMO-INFORME.md`. Código de salida 0 = todo aprobado.
Mapa completo de qué prueba cubre qué: `tests/CATALOGO.md`. Evaluación de IA con tu clave real: `tests/ai-eval/README.md`.
Para agregar una prueba nueva: ponla en `tests/suites/` y añade una línea en `run-all.sh`.
