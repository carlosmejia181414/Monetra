# Monetra v5 - Cómo actualizar (modo claro/oscuro, Asesor IA, Administrador, PDFs)

**Novedades:** modo claro/oscuro · diseño más armonioso · banderas más pequeñas · pestaña **Asesor IA** · panel de **Administrador** con estadísticas · brochure y manual en PDF descargables desde la portada.

> IMPORTANTE: si ya tienes Monetra funcionando, **NO ejecutes `instalar-todo.sql`** (borra las tablas y perderías tus datos). Solo ejecuta `ia.sql` y `admin.sql`. `instalar-todo.sql` es únicamente para una instalación nueva.

## Paso 1 - Copiar los archivos
1. Descomprime `monetra-web.zip`.
2. Copia **todo su contenido** dentro de tu carpeta local del repositorio (reemplaza archivos).
3. Conserva tu `www/config.js` (el ZIP no lo trae). Debe tener tu URL `https://otjtponfhjccnovzkqzt.supabase.co` y tu clave **publishable/anon** (nunca la secret ni service_role).

## Paso 2 - Base de datos (Supabase > SQL Editor)
1. New query, pega `supabase/ia.sql`, **Run**.
2. New query, abre `supabase/admin.sql`. En la ÚLTIMA línea cambia `TU-CORREO@ejemplo.com` por el correo con el que te registraste en Monetra (debes haberte registrado antes). Pega todo y **Run**.

## Paso 3 - Activar el Asesor IA (función de Supabase)
Necesitas una clave de la API de Anthropic (console.anthropic.com > API Keys). Es de pago por uso; el límite diario por usuario lo controla la función.
1. Supabase > **Edge Functions** > **Deploy a new function** > "Via Editor" (o con la CLI).
2. Nombre exacto: `ai-advisor`. Pega el contenido de `supabase/functions/ai-advisor/index.ts` y **Deploy**.
3. En esa función (o en Edge Functions > Secrets) agrega el secreto `ANTHROPIC_API_KEY` = tu clave.
4. Opcionales: `AI_MODEL` (por defecto `claude-sonnet-4-5`) y `AI_DAILY_LIMIT` (por defecto 10 consultas por usuario al día).
5. Deja activada la verificación JWT (valor por defecto): solo usuarios con sesión pueden usarla.

Sin este paso, la pestaña Asesor IA igualmente muestra el **diagnóstico rápido** (puntaje, alertas, plan 50/30/20); solo el botón "Analizar con IA" mostrará que falta publicar la función.

## Paso 4 - Publicar
```
git add .
git commit -m "Monetra v5"
git push origin main
```
Espera el check verde en la pestaña Actions y abre la página con **Ctrl+F5** (en el celular, abre en pestaña privada o borra la caché).

## Paso 5 - Probar
- En la app, el botón luna/sol (arriba) cambia entre modo oscuro y claro.
- Pestaña **Asesor IA**: diagnóstico al instante y botón "Analizar mi presupuesto con IA".
- Si eres administrador aparece **Administrador** en el menú lateral (o abre `/admin.html`): visitas, visitantes, registros, clics, descargas, consultas IA, idiomas, dispositivos y orígenes.
- Portada: sección Asesor IA y sección **Guías gratuitas** con los PDF (`www/docs/`).

## Privacidad de las métricas
Se guardan eventos anónimos (página, evento, idioma, tipo de dispositivo, sitio de origen y un identificador de sesión temporal). No se guardan IP, cookies ni datos personales. Solo el administrador puede ver las estadísticas.

## Solución de problemas
- "Falta ejecutar supabase/admin.sql" / "Tu cuenta no es administradora": ejecuta `admin.sql` con tu correo real, y vuelve a entrar.
- "La función ai-advisor aún no está publicada": repite el Paso 3.
- "El servicio de IA no respondió (401/404)": revisa `ANTHROPIC_API_KEY` y `AI_MODEL`.
- "Llegaste al límite de consultas": sube `AI_DAILY_LIMIT` o espera al día siguiente.
- Google login a la página equivocada: Supabase > Authentication > URL Configuration, Site URL = tu dirección de GitHub Pages y Redirect URLs = esa dirección con `/**`.
