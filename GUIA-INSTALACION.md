# Monetra - Guía completa de instalación (web + base de datos)

Monetra es una página web de finanzas personales. Los datos se guardan en una base de datos en la nube (Supabase) y la página se publica gratis con GitHub Pages.

## Archivos del proyecto
```
monetra/
├─ www/                      <- la página web (esto es lo que se publica)
│  ├─ index.html             Página de presentación (landing)
│  ├─ app.html               La aplicación (login, registro y finanzas)
│  ├─ app.js                 Lógica de la aplicación
│  ├─ data.js                Conexión con la base de datos (Supabase)
│  ├─ i18n.js                Español / English
│  ├─ styles.css, logo.png, logo.svg (copia de respaldo), favicon.png, manifest.webmanifest, sw.js
│  ├─ flags/                 Banderas es.svg, en.svg, fr.svg (selector de idioma)
│  ├─ icons/                 Íconos de la app
│  ├─ vendor/                Librerías incluidas (Chart.js y supabase-js)
│  └─ config.example.js      Plantilla de configuración -> la copiarás como config.js
├─ supabase/
│  ├─ instalar-todo.sql      INSTALACIÓN NUEVA (tablas, seguridad y modo hogar)
│  ├─ setup.sql              Solo la parte de cuentas individuales
│  ├─ hogar.sql              Solo el modo hogar (si ya tenías setup.sql)
│  └─ actualizar-idiomas.sql ACTUALIZACIÓN v3 (agrega francés a las categorías iniciales)
├─ .github/workflows/pages.yml   Publica www/ en GitHub Pages automáticamente
├─ package.json, .gitignore, LEEME.md, GUIA-INSTALACION.md
```

## PARTE 1 - Crear la base de datos en Supabase
1. Entra a https://supabase.com y crea una cuenta (puedes usar tu cuenta de GitHub).
2. Pulsa **New project**. Elige un nombre (por ejemplo `monetra`), escribe una contraseña de base de datos (guárdala), elige la región más cercana y el plan **Free**. Espera 1-2 minutos a que termine.
3. En el menú izquierdo abre **SQL Editor** > **New query**.
4. Abre el archivo `supabase/instalar-todo.sql`, copia TODO su contenido, pégalo en el editor y pulsa **Run**.
   Debe responder "Success. No rows returned".
   - Este script crea las tablas, activa la seguridad (cada usuario ve solo sus datos), el modo hogar y las categorías iniciales de cada usuario nuevo.
   - ATENCIÓN: borra las tablas `categories` y `transactions` si ya existían. Úsalo solo en una instalación nueva.
   - Si ya habías ejecutado `setup.sql` antes y solo falta el modo hogar, ejecuta únicamente `hogar.sql`.
5. Verifica: **Table Editor** debe mostrar las tablas `categories`, `transactions`, `households` y `household_members`.

### Configurar el registro de usuarios
1. **Authentication > Sign In / Providers**: confirma que **Email** esté activado y que **Allow new users to sign up** esté ACTIVADO.
2. Opción **Confirm email**:
   - Activado (recomendado en producción): cada usuario debe confirmar su correo. El servicio de correo gratuito de Supabase envía muy pocos mensajes por hora; para muchos usuarios configura tu propio SMTP en Authentication > Emails > SMTP Settings.
   - Desactivado (útil para pruebas): el usuario entra de inmediato sin confirmar.
3. Más adelante (Parte 3) volverás aquí a configurar **URL Configuration**.

### Copiar tus datos de conexión
1. Abre **Project Settings > API Keys** (en algunos paneles aparece como **API**).
2. Copia:
   - **Project URL**, por ejemplo `https://abcdefgh.supabase.co` (sin `/rest/v1/` al final).
   - La clave pública: **Publishable key** (`sb_publishable_...`) o **anon public** (`eyJ...`).
3. NUNCA uses ni compartas la clave **secret** o **service_role**. La clave pública sí puede estar en la página: la protección la dan el inicio de sesión y las reglas de seguridad (RLS) del SQL.

## PARTE 2 - Configurar la página
1. En la carpeta `www/`, copia `config.example.js` y llámalo `config.js`.
2. Ábrelo y completa tus datos:
   ```js
   window.APP_CONFIG = {
     SUPABASE_URL: "https://TU-PROYECTO.supabase.co",
     SUPABASE_ANON_KEY: "tu-clave-publishable-o-anon"
   };
   ```
3. Guarda. (Opcional) Probar en tu computadora: instala Node.js, abre una terminal en esta carpeta y ejecuta `npx serve www`; abre la dirección que muestre. No abras los .html con doble clic.

## PARTE 3 - Publicar en GitHub Pages
1. Crea una cuenta en https://github.com y un repositorio nuevo (por ejemplo `monetra`). Para usar GitHub Pages gratis el repositorio debe ser **Public**. No contiene datos de nadie: los datos viven en Supabase.
2. Instala Git (https://git-scm.com) y, en una terminal:
   ```bash
   git config --global user.name "Tu Nombre"
   git config --global user.email "tu-correo@ejemplo.com"
   git clone https://github.com/TU-USUARIO/monetra.git
   ```
3. Copia TODO el contenido de este proyecto (www, supabase, .github, package.json, .gitignore, LEEME.md, GUIA-INSTALACION.md) dentro de la carpeta `monetra` clonada. Asegúrate de que `www/config.js` exista con tus datos.
4. Sube los archivos:
   ```bash
   cd monetra
   git add .
   git commit -m "Monetra"
   git push origin main
   ```
   (Si tu rama se llama `master`, usa `git push origin master`.)
5. En GitHub: **Settings > Pages > Build and deployment > Source: GitHub Actions**.
6. Abre la pestaña **Actions**: debe ejecutarse **Publicar app web**. Cuando termine con ✅, tu dirección es:
   `https://TU-USUARIO.github.io/monetra/`
   (si no arrancó, elige el workflow y pulsa **Run workflow**).
7. Vuelve a Supabase > **Authentication > URL Configuration**:
   - **Site URL**: `https://TU-USUARIO.github.io/monetra/`
   - **Redirect URLs**: agrega `https://TU-USUARIO.github.io/monetra/**`
   Esto hace que los correos de confirmación y de recuperar contraseña regresen a tu página.

## PARTE 4 - Primer uso
1. Abre tu dirección de GitHub Pages: verás la página de presentación. Pulsa **Empezar gratis**.
2. Pestaña **Crear cuenta**: escribe correo y contraseña (mínimo 6 caracteres). Si tienes "Confirm email" activado, abre el enlace del correo.
3. Inicia sesión: ya tienes tus categorías iniciales y puedes registrar ingresos, gastos fijos recurrentes y variables.
4. **Modo hogar** (compartir con pareja o familia): sección **Hogar** > **Crear hogar**. Comparte el código de invitación; la otra persona (con su propia cuenta) lo escribe en **Unirme a un hogar**. Arriba aparece el selector **Personal / Hogar**.
5. **Gastos recurrentes**: en "Movimientos del mes" puedes editar o eliminar un gasto solo en ese mes, o toda la serie.
6. **Respaldo**: botones **Exportar respaldo** (descarga un .json) e **Importar respaldo** (agrega los datos sin borrar nada). Hazlo de vez en cuando.
7. **Idioma**: tres banderas (España, Reino Unido, Francia) arriba a la derecha en la portada, el login y la app. Se recuerda tu elección.

## PARTE 5 - Inicio de sesión con Google (opcional)
La app ya incluye el botón **Continuar con Google**. Para que funcione debes configurarlo una vez en Google y en Supabase. Es gratis y no requiere verificación de Google, porque solo se pide el correo y el nombre.

### A) Crear las credenciales en Google
1. Entra a https://console.cloud.google.com con tu cuenta de Google y crea un proyecto (por ejemplo `Monetra`).
2. Menú **APIs y servicios > Pantalla de consentimiento de OAuth** (o **Google Auth Platform**):
   - Tipo de usuario: **Externo**.
   - Nombre de la app: `Monetra`; correo de asistencia y correo de contacto: el tuyo.
   - Dominios autorizados: DÉJALO VACÍO. Google rechaza `supabase.co` y `github.io` ahí ("Debe ser un dominio privado de nivel superior") y no hace falta para este caso.
   - No llenes página principal ni política de privacidad (son opcionales).
   - Permisos (scopes): deja los básicos (`email`, `profile`, `openid`).
   - Al terminar, pulsa **Publicar aplicación** (pasar a "En producción"). Si la dejas en "Prueba", solo podrán entrar los correos que agregues como usuarios de prueba.
3. **Credenciales > Crear credenciales > ID de cliente de OAuth**:
   - Tipo de aplicación: **Aplicación web**.
   - **Orígenes autorizados de JavaScript**: `https://TU-USUARIO.github.io` (y, si pruebas en tu computadora, `http://localhost:3000`).
   - **URI de redireccionamiento autorizados**: `https://TU-PROYECTO.supabase.co/auth/v1/callback`
     (la dirección exacta aparece en Supabase, en el paso B, como "Callback URL").
4. Pulsa **Crear** y copia el **ID de cliente** y el **Secreto del cliente**.

### B) Activar Google en Supabase
1. Supabase > **Authentication > Sign In / Providers > Google**.
2. Activa **Enable Sign in with Google**, pega el **Client ID** y el **Client Secret** y pulsa **Save**.
3. Confirma que en **Authentication > URL Configuration** estén tu **Site URL** y tu **Redirect URL** (`https://TU-USUARIO.github.io/monetra/**`) de la Parte 3.
4. Las categorías iniciales de cada cuenta nueva (también las de Google) salen en el idioma del usuario (es/en/fr) si ejecutaste `instalar-todo.sql` o `actualizar-idiomas.sql`.

### C) Probar
Abre tu página > **Empezar gratis** > **Continuar con Google**. Elige tu cuenta y volverás a la app con la sesión iniciada.
Si ya tenías una cuenta con ese mismo correo, Supabase vincula ambas formas de entrada a la misma cuenta.

### Problemas comunes con Google
| Síntoma | Solución |
|---|---|
| Aparece un texto tipo `{"error":"Unsupported provider: provider is not enabled"}` | Falta activar Google en Supabase (paso B). |
| Google muestra `redirect_uri_mismatch` | La URI de redireccionamiento en Google debe ser exactamente `https://TU-PROYECTO.supabase.co/auth/v1/callback`. |
| Google dice "Acceso bloqueado / app no verificada" | La pantalla de consentimiento está en "Prueba": agrégate como usuario de prueba o pásala a producción. |
| Vuelve a la página pero sin sesión | Revisa Site URL y Redirect URLs en Supabase (Parte 3, paso 7). |
| Nunca pongas el Client Secret de Google en el repositorio | Solo va en Supabase. |

## ACTUALIZAR de la versión anterior a la v3 (3 idiomas, banderas, logo y login)
1. **Base de datos (1 minuto):** Supabase > SQL Editor > New query > pega TODO `supabase/actualizar-idiomas.sql` > Run. No borra datos. (Solo cambia las categorías iniciales de cuentas y hogares nuevos para incluir francés.)
2. **Archivos:** copia el contenido del ZIP dentro de tu carpeta clonada del repositorio, aceptando reemplazar. Tu `www/config.js` NO viene en el ZIP: no lo borres.
3. **Subir:**
   ```bash
   git add .
   git commit -m "Monetra v3: 3 idiomas, logo y login"
   git push origin main
   ```
4. **Esperar el deploy:** GitHub > Actions > "Publicar app web" debe terminar en verde.
5. **Limpiar la caché del navegador (importante):** versiones anteriores guardaban archivos viejos en tu navegador y pueden mezclarse con los nuevos (logo roto, login que no aparece).
   - Abre tu página, presiona F12 > pestaña **Application** (Aplicación) > **Storage** > **Clear site data**; en **Service Workers** pulsa **Unregister** si aparece alguno. Cierra y vuelve a abrir.
   - Alternativa: abre la página en una ventana privada, o Ctrl + Shift + R.
6. **Verificar:** debes ver las tres banderas, el logo y la ventana de login. Si algo falla, la app muestra un aviso en rojo con el motivo.

## Si el logo o el login no cargan
| Síntoma | Qué hacer |
|---|---|
| Logo roto | Abre `https://TU-USUARIO.github.io/monetra/logo.png` directamente. Si da 404, el archivo no se subió: revisa que `www/logo.png` esté en GitHub (pestaña Code) y vuelve a hacer push. |
| Pantalla en blanco o sin login | Limpia la caché (paso 5). Si aparece el aviso rojo, copia su texto. |
| Aviso "Falta configurar la base de datos" | No existe `www/config.js` en el repositorio (cópialo desde `config.example.js` y súbelo). |
| Nada cambia tras subir | Revisa Actions: el deploy debe estar en verde; luego Ctrl + Shift + R. |

## Cómo actualizar la página después
Edita los archivos y ejecuta `git add .`, `git commit -m "cambio"` y `git push origin main`. GitHub publica solo. Si no ves el cambio, recarga con Ctrl + Shift + R o usa una ventana privada.

## Solución de problemas
| Mensaje o síntoma | Causa y solución |
|---|---|
| "Falta configurar la base de datos (archivo config.js)" | No existe `www/config.js` o está vacío. Revisa la Parte 2 y vuelve a hacer push. |
| "La base de datos no está actualizada: ejecuta supabase/hogar.sql" | Falta ejecutar el SQL (Parte 1, paso 4). |
| "Correo o contraseña incorrectos" | Datos erróneos o correo sin confirmar. |
| El correo de confirmación abre una página que no existe | Revisa Site URL y Redirect URLs (Parte 3, paso 7). |
| No llegan correos / "email rate limit exceeded" | Límite del servicio gratuito. Desactiva "Confirm email" para pruebas o configura SMTP propio. |
| Actions falla con "Get Pages site failed" / "Not Found" | Settings > Pages > Source debe ser **GitHub Actions** y el repositorio debe ser público (plan gratis). |
| La página se ve igual después de actualizar | Ctrl + Shift + R, o ventana privada. |
| "new row violates row-level security policy" | El SQL no se ejecutó completo o la sesión expiró; vuelve a iniciar sesión. |
| Ves datos de otra cuenta o ninguno | Revisa el selector Personal / Hogar de la parte superior. |
| Quiero otro idioma | Banderas de arriba a la derecha: español, inglés, francés. Las alertas y sugerencias generadas automáticamente en Analytics siguen en español. |

## Notas importantes
- Los proyectos gratuitos de Supabase pueden pausarse tras un tiempo sin uso; se reactivan desde el panel. Revisa los límites vigentes en supabase.com/pricing.
- Cualquier persona puede crear una cuenta (registro abierto), pero las reglas de seguridad impiden ver datos ajenos.
- Para eliminar la posibilidad de nuevos registros: Authentication > Sign In / Providers > desactiva "Allow new users to sign up".
