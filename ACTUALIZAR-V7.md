# Monetra v7 – Guía de actualización paso a paso

No necesitas cambiar nada en el código: solo subir los archivos nuevos a GitHub. Lo único que se hace en Supabase es **opcional** (parte C y D).

## Qué cambia en esta versión
1. Se arregló el error al abrir la app instalada en el celular.
2. Banderas más grandes y redondas en celular.
3. Landing en celular: mismas ondulaciones, texto oscuro para que se lea. En computador queda igual que antes.
4. El registro pide el **nombre** y muestra "¡Registro exitoso!" en el idioma elegido (ES/EN/FR).
5. Modo claro nuevo (blanco y limpio).
6. **Tarjetas del resumen en modo oscuro: opción B** (fondo oscuro con barra lateral de color; número en blanco).
7. **Cerrar sesión** vuelve a la página principal (landing).
8. **Folleto y manual en 3 idiomas**: se descarga el PDF del idioma elegido.

---
## PARTE A. Subir la página nueva (obligatorio)

1. Descarga y descomprime `monetra-web.zip`. Verás una carpeta `www`.
2. Abre tu copia **actual** de `www/config.js` (la que tiene tu clave de Supabase) y cópiala dentro de la carpeta `www` nueva. El ZIP no la trae para no pisar tu clave.
3. Entra a github.com → tu repositorio **Monetra**.
4. Pulsa **Add file → Upload files**.
5. Arrastra **todo el contenido** de la carpeta `www` (archivos y carpetas: `docs`, `flags`, etc.). Si te pregunta, reemplaza los existentes. Importante: sube también la carpeta `docs` completa (ahora tiene 6 PDFs).
6. Abajo escribe un mensaje (ej. "v7") y pulsa **Commit changes**.
7. Espera 1–2 minutos (pestaña Actions: debe terminar en verde) y abre tu página.
8. Si ves la versión vieja: recarga forzada (Ctrl+Shift+R; en celular, cierra y abre el navegador).
9. **App instalada en el celular:** bórrala (mantén pulsado el icono → Eliminar), abre la página en el navegador y vuelve a instalarla.

## PARTE B. Probar que todo funciona
- Abre la landing en el celular: el texto se lee y las ondas siguen igual.
- Cambia el idioma con las banderas y pulsa **Descargar PDF**: debe bajar el folleto/manual en ese idioma.
- Crea una cuenta de prueba: debe pedir el nombre y mostrar el mensaje de registro exitoso en tu idioma.
- Entra a la app → **Cerrar sesión**: debe llevarte a la landing.
- Activa el modo oscuro: las tarjetas de Ingresos / Gastos fijos / Variables / Ahorro llevan una barra de color a la izquierda.

## PARTE C. (Opcional) Que el correo de confirmación llegue en el idioma del usuario
Abre `CORREO-CONFIRMACION.md` y copia la plantilla en Supabase → Authentication → Emails → **Confirm signup** → Save.

## PARTE D. Dejar la base de datos en cero para tu marcha blanca
⚠️ Esto **borra todo** y no se puede deshacer. Hazlo solo cuando quieras empezar de cero.
1. Entra a supabase.com → tu proyecto → **SQL Editor** → **New query**.
2. Abre el archivo `limpiar-datos.sql`, copia todo el texto y pégalo.
3. En la línea `v_correo text := 'TU-CORREO@ejemplo.com';` cambia el texto entre comillas por **tu correo** (la cuenta con la que entras como administrador). Esa cuenta se conserva.
4. Pulsa **Run**.
5. Abajo debe aparecer una tabla con: movimientos 0, categorías 8, hogares 0, eventos 0, usuarios 1.
6. Se borran: movimientos, categorías, hogares, uso de IA, estadísticas de visitas y todas las demás cuentas. Se conservan: tu cuenta, tu perfil, tu permiso de administrador y la estructura de la base.
7. Si escribes un correo que no existe, el script se detiene sin borrar nada.
8. (Opcional) Fotos de perfil: Supabase no permite borrarlas por SQL. Ve a **Storage → avatars** y borra las carpetas de los demás usuarios.

## PARTE E. Pendiente de Supabase (solo si el login con Google o el enlace del correo te llevan a una dirección equivocada)
Supabase → Authentication → **URL Configuration**:
- **Site URL**: tu página, ej. `https://carlosmejia181414.github.io/Monetra/`
- **Redirect URLs**: la misma dirección con `**` al final, ej. `https://carlosmejia181414.github.io/Monetra/**` → Save.
Si ya funciona bien, no toques nada.
