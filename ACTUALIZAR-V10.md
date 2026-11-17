# Monetra v10 – Metas de ahorro + iconos

## Qué trae
- **Metas de ahorro** (casa, carro, viajes, fondo de emergencia…): barra de progreso, aportes y retiros, plan mensual sugerido ("ahorra $X al mes") y aviso si vas atrasado.
- **Metas compartidas** cuando estás en modo Hogar.
- Plan Gratis: 2 metas activas. Pro: ilimitadas.
- **Iconos automáticos** en las categorías según su nombre (ES/EN/FR).
- **Iconos** en el celular de la landing page.
- Quitamos las tarjetas de resumen (Ingresos, Gastos fijos…) en Categorías, Hogar, Perfil y Metas.
- Brochure y manual (ES/EN/FR) actualizados con metas e iconos.

## Pasos
1. Supabase > SQL Editor > New query > pega TODO `supabase/v10-metas.sql` > Run (se puede ejecutar varias veces; no borra datos).
2. Sube los archivos a GitHub (reemplaza la carpeta, **sin** pisar tu `www/config.js`):
   `git add . && git commit -m "v10 metas" && git push`
3. Espera 1–2 minutos y abre la web con **Ctrl+Shift+R** (recarga forzada).

Si antes no habías ejecutado `v9.sql` y `v9-validaciones.sql`, hazlo también (en ese orden, antes de v10).
