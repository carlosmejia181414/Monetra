# Monetra v11 – Guía con IA dentro del dashboard

Un botón flotante "Guía" (abajo a la derecha) abre un chat que explica cómo usar cada parte del dashboard. Sabe en qué pantalla estás y te sugiere preguntas (por ejemplo, en Metas: "¿Cómo creo una meta?"). Responde en español, inglés o francés.

- Gratis: 20 preguntas al día. Pro: 80 al día. (No gasta tus consultas del Asesor IA.)
- No ve tus cifras ni tus datos: solo explica cómo usar la app.

## Pasos
1. Supabase > SQL Editor > New query > pega TODO `supabase/v11-guia.sql` > Run (se puede ejecutar varias veces).
2. Supabase > Edge Functions > **Deploy a new function** > nombre exacto **app-guide** > pega `supabase/functions/app-guide/index.ts` > Deploy.
   - Aquí **Verify JWT debe quedar ENCENDIDO** (solo usuarios con sesión).
   - Usa el mismo secreto `ANTHROPIC_API_KEY` que ya tienes.
3. (Recomendado) Vuelve a publicar `site-agent` con el archivo nuevo: ahora también conoce las metas y la guía. Ahí Verify JWT sigue APAGADO.
4. `git add . && git commit -m "v11 guia" && git push`, espera 1–2 minutos y recarga con Ctrl+Shift+R.

Opcionales (puedes ignorarlos): `GUIDE_MODEL` (por defecto claude-haiku-5-5), `GUIDE_FREE_LIMIT` (20), `GUIDE_PRO_LIMIT` (80).

Si el chat dice "La guía aún no está activada", falta publicar `app-guide` (paso 2).
