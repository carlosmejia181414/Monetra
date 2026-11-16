# Monetra v8 — Planes Gratis/Pro, gráfico único, monedas, categoría rápida y escaneo de boletas

Fase 1 y 2 listas. **Fase 3 (pagos con Stripe) queda PENDIENTE**: por ahora el plan Pro se activa a mano desde el panel de administrador.

## Qué hay de nuevo
- **Planes**: Gratis y Pro (US$5/mes). Todo usuario nuevo recibe **14 días de Pro**. Después pasa a Gratis.
  - Gratis: movimientos ilimitados, 12 categorías propias, gráfico de mes actual y 3 meses, 3 consultas IA al mes, 3 boletas al mes, una sola moneda.
  - Pro: categorías ilimitadas, historial completo, IA sin límite mensual, hasta 100 boletas al mes, hogar compartido, varias monedas.
- **Un solo gráfico** (sección Gráficos) que cambia con filtros: qué ver, agrupar por, período, vista (normal, Pareto, 50/30/20, acumulado, mapa de calor) y forma.
- **Moneda**: cada usuario elige su moneda en Perfil. Los montos se convierten a la tasa actual. Cada movimiento guarda su moneda original (Pro puede registrar en otra moneda).
- **Crear categoría al registrar**: opción "+ Crear categoría…" al final de la lista. El menú Categorías sigue igual.
- **Escanear boleta**: botón "Escanear boleta" en Registrar. La IA lee la foto y rellena el formulario; tú confirmas antes de guardar. La foto no se guarda.

## Pasos (en este orden)

### 1. Base de datos
1. Supabase → **SQL Editor** → New query.
2. Abre `supabase/plan.sql`, copia TODO, pégalo y pulsa **Run**. Se puede ejecutar varias veces sin problema.
   (Si instalas desde cero, `instalar-todo.sql` ya lo incluye.)

### 2. Funciones (Edge Functions)
1. Publica la función nueva **receipt-scan** con el contenido de `supabase/functions/receipt-scan/index.ts` (mismo método que usaste para `ai-advisor`).
2. **Vuelve a publicar `ai-advisor`** (cambió para respetar el límite Gratis).
3. Ambas usan el secreto `ANTHROPIC_API_KEY` que ya tienes. Opcionales:
   - `SCAN_MODEL` (por defecto `claude-haiku-5-5`)
   - `SCAN_MONTHLY_LIMIT` (por defecto 100 boletas/mes para Pro)

### 3. Subir la web
Descomprime `monetra-web.zip` sobre tu carpeta (no sobrescribe `www/config.js`) y haz:
```
git add -A
git commit -m "Monetra v8: planes, gráfico único, monedas, escaneo de boletas"
git push
```
Espera 1–2 minutos y recarga con Ctrl+Shift+R.

### 4. Activar Pro a un usuario
Entra a **Administrador → Usuarios**: columna **Plan** con botones **Dar Pro** (te pide los días) y **Quitar Pro**.

## Cosas que debes saber
- **Usuarios actuales**: al abrir la app reciben su prueba Pro de 14 días.
- **Conversión de moneda**: se convierte a la tasa del día (no a la tasa del día de cada movimiento). Si cambias de moneda, todo se recalcula.
- **Tasas de cambio**: vienen de open.er-api.com (con frankfurter.app de respaldo). La atribución "Rates By Exchange Rate API" ya aparece en Perfil; no la quites. Desde mi entorno no pude probar esa API (bloqueada), así que **prueba**: Perfil → cambia la moneda y revisa que aparezca la hora de actualización. Si falla, avísame.
- **Costo de la IA**: cada boleta cuesta una fracción de centavo con el modelo Haiku; por eso el límite mensual.
- **Botón "Pasar a Pro"**: mientras no haya pagos, muestra "pagos próximamente". Cuando tengas un enlace de pago, ponlo en `www/config.js` como `UPGRADE_URL: "https://..."`.
- **Plan anual**: no se muestra; solo US$5/mes.
- Si no ejecutas `plan.sql`, la app funciona sin límites (sin planes).

## Fase 3 (pendiente): Stripe
Cuando quieras: Checkout + webhook que llama a la misma función de plan (`source = stripe`). No hace falta rehacer nada de lo anterior.
