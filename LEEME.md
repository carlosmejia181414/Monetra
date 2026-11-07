# Monetra (web)

La guía paso a paso completa está en **GUIA-INSTALACION.md**. Para actualizar a la v5 (modo claro/oscuro, Asesor IA, Administrador, PDFs) lee **ACTUALIZAR-V5.md**.

Aplicación web de finanzas personales con base de datos en la nube (Supabase). Se publica con GitHub Pages.

## Estructura
- `www/` : la página (landing en index.html, la app en app.html)
- `supabase/` : scripts SQL (instalar-todo.sql = instalación nueva; actualizar-idiomas.sql = actualizar una instalación existente a v3)
- `.github/workflows/pages.yml` : publica `www/` en GitHub Pages en cada push a main

## Configuración (una sola vez)
1. Supabase > SQL Editor: instalación NUEVA: ejecuta `supabase/instalar-todo.sql`.
   Si ya habías ejecutado setup.sql: ejecuta solo `supabase/hogar.sql`.
2. Crea `www/config.js` (copia de `config.example.js`) con tu Project URL y la clave publishable/anon.
3. Supabase > Authentication > URL Configuration: Site URL y Redirect URLs = la dirección de tu GitHub Pages.
4. GitHub > Settings > Pages > Source: GitHub Actions.
5. `git add . && git commit -m "..." && git push origin main`

## Probar en tu computadora
`npx serve www` y abre la dirección que muestre. No abras los .html con doble clic.
