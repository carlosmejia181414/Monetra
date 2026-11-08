# Monetra v7 – Instrucciones de actualización

Esta versión **no requiere cambios en Supabase** (no hay SQL nuevo).

## Qué incluye
1. **Error al abrir la app instalada (PWA)** corregido ("Cannot read properties of null (reading 'classList')").
2. **Banderas** más grandes y redondas en celular.
3. **Landing en celular**: se mantienen las ondulaciones originales; solo cambia el color del texto a oscuro para que se lea. En computador queda como al inicio.
4. **Registro con nombre**: el formulario pide el nombre; se guarda en tu perfil.
5. **Registro exitoso**: aparece un panel "¡Registro exitoso!" con el botón "Ir a iniciar sesión". Si en Supabase la confirmación por correo está desactivada, entra directo a la app.
6. **Modo claro nuevo**: fondo blanco, tarjetas con borde de color (verde, rojo, dorado, morado) y botones morados.
7. PDFs (folleto y manual) regenerados.

## Pasos
1. Descomprime `monetra-web.zip`.
2. Copia **tu** `www/config.js` (con tu clave pública) dentro de `www/`. El ZIP no la incluye.
3. En GitHub: repositorio Monetra → Add file → Upload files → sube el contenido de la carpeta `www/` (reemplaza todo) → Commit.
4. Espera 1–2 minutos a que GitHub Pages publique.
5. **Celular con la app instalada**: borra el icono de Monetra, abre el sitio en el navegador (recarga forzada) y vuelve a instalarla. Así se limpia la versión vieja.

## Opcional en Supabase
Authentication → URL Configuration: Site URL = tu URL de GitHub Pages; Redirect URLs = esa URL con `/**`. Esto hace que el enlace del correo de confirmación y Google regresen a tu sitio.
