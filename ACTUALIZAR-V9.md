# Monetra v9

## Qué hay de nuevo
- **Banner de la página de inicio**: el título y los textos ahora usan el mismo amarillo de «claridad», sin sombra.
- **Pantalla de carga**: al abrir la app (y siempre al abrirla instalada en el celular) aparece el logo, el nombre Monetra, el celular de la landing y las olas curvas, y luego entra a la app.
- **Asesor IA**: la última recomendación queda guardada con su fecha y hora. Al generar una nueva, reemplaza a la anterior.
- **Asistente en la página de inicio**: botón «¿Dudas?» abajo a la derecha; responde preguntas sobre Monetra en español, inglés y francés.
- **Panel de administrador**: en la pestaña Audiencia hay dos tablas nuevas: **países de las visitas** y **países donde se crean las cuentas** (solo el código de país, nunca la IP).
- **Categoría al registrar**: el botón **+ Nueva** junto a «Categoría» reemplaza la opción dentro de la lista (en el celular se veía como un «+» con círculo). La lista queda solo con tus categorías.
- **Brochure y manual** actualizados en español, inglés y francés (planes, escaneo de boletas, gráfico único, monedas, etc.).
- Pequeño arreglo: «Gasto fijo/variable» ahora se traduce en inglés y francés.

## Paso 1: base de datos
Supabase → **SQL Editor** → New query → pega TODO `supabase/v9.sql` → **Run**. (Se puede repetir sin problema.)

## Paso 2: dos funciones nuevas (Edge Functions)
Para cada una: **Edge Functions → Deploy a new function → Via Editor**, escribe el nombre EXACTO, borra el código de ejemplo, pega el archivo y pulsa **Deploy**.

| Nombre exacto | Archivo |
|---|---|
| `geo` | `supabase/functions/geo/index.ts` |
| `site-agent` | `supabase/functions/site-agent/index.ts` |

**Muy importante**: estas dos las usan visitantes que aún no tienen cuenta, así que deben tener **Verify JWT apagado**. Después de publicarlas: abre la función → pestaña **Details** (o **Settings**) → apaga **Verify JWT** (o «Enforce JWT Verification») → guarda. Si usas la terminal: `supabase functions deploy geo --no-verify-jwt` y `supabase functions deploy site-agent --no-verify-jwt`.

`site-agent` usa el mismo secreto `ANTHROPIC_API_KEY`. Opcionales (puedes ignorarlos): `SITE_AGENT_MODEL` (por defecto `claude-haiku-5-5`), `SITE_AGENT_IP_LIMIT` (25 preguntas por visitante al día) y `SITE_AGENT_DAY_LIMIT` (800 preguntas al día en total, para controlar el costo).

## Paso 3: subir la web
```
git add -A
git commit -m "Monetra v9"
git push
```
Espera 1–2 minutos y recarga con Ctrl+Shift+R. En el celular instalado, cierra y vuelve a abrir la app.

## Cómo probar
1. **Splash**: abre la app en una pestaña nueva.
2. **Asesor IA**: genera una recomendación, cambia de pestaña y vuelve: debe seguir ahí con su fecha.
3. **Chat**: en la página de inicio pulsa «¿Dudas?» y pregunta «¿Cuánto cuesta?».
4. **Países**: visita la página de inicio y entra a la app; después de unos minutos, Administrador → Audiencia debe mostrar tu país. Las visitas y cuentas anteriores a la v9 aparecen como «Desconocido».
5. **Categoría**: en Registrar pulsa **+ Nueva**.

## Notas
- El país de una cuenta se guarda la primera vez que esa persona entra a la app después de esta actualización.
- Las funciones de la v8 (`receipt-scan`, `ai-advisor`) no cambian. El asesor debe usar el modelo `claude-sonnet-5-5` (ya corregido en la v8.1).
- Fase 3 (pagos con Stripe) sigue pendiente.

## v9.4 (QA)
1. En Supabase > SQL Editor ejecuta `supabase/v9-validaciones.sql` (es seguro repetirlo).
2. `git add . && git commit -m "v9.4 QA" && git push`
3. Refresca con Ctrl+Shift+R.
