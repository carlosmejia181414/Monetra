# Monetra v6 - Cómo actualizar (nueva paleta + Administrador avanzado + PDFs nuevos)

**Novedades**
- Nueva paleta **E** (grafito con coral, rosa y amarillo de la portada) en modo oscuro, y crema con texto ciruela en modo claro.
- **Panel de Administrador** con 5 pestañas y las 12 funciones: comparación contra el periodo anterior, embudo de conversión, retención 7 y 30 días, usuarios activos (DAU/WAU/MAU), mapa de calor de horas de mayor tráfico, funciones más usadas, movimientos por usuario y tamaño de hogares, consultas IA con costo estimado y usuarios que más la usan, usuarios nuevos sin movimientos, tabla de usuarios, filtro de fechas personalizado con exportación a CSV, y alertas automáticas.
- Brochure y manual en PDF rediseñados con la nueva paleta y capturas actualizadas (ya enlazados en la portada, carpeta `www/docs/`).

> Si ya tienes Monetra funcionando, **NO ejecutes `instalar-todo.sql`** (borra tus datos).

## Paso 1 - Copiar los archivos
1. Descomprime `monetra-web.zip`.
2. Copia **todo su contenido** sobre tu carpeta local del repositorio (reemplaza archivos).
3. Conserva tu `www/config.js` (el ZIP no lo trae).

## Paso 2 - Actualizar la base de datos (Supabase > SQL Editor)
1. New query, abre `supabase/admin.sql` y **antes de ejecutarlo** cambia la última línea: `TU-CORREO@ejemplo.com` por tu correo de Monetra (si ya eras administrador, puedes dejarlo igual: no se duplica).
2. Pega todo y pulsa **Run**. Reemplaza las funciones de estadísticas de la v5 por las nuevas y no toca tus datos.
3. No necesitas volver a ejecutar `ia.sql` si ya lo hiciste. La función `ai-advisor` no cambió.

## Paso 3 - Publicar
```
git add .
git commit -m "Monetra v6"
git push origin main
```
Espera el check verde en Actions y abre la página con **Ctrl+F5** (en el celular, pestaña privada o borra la caché).

## Paso 4 - Probar el administrador
1. Entra a la app con tu cuenta y abre **Administrador** en el menú (o `/admin.html`).
2. Pestañas: **Resumen** (indicadores con ▲▼ frente al periodo anterior, gráfico diario, embudo), **Audiencia** (mapa de calor, idioma, dispositivo, orígenes), **Uso de la app** (DAU/WAU/MAU, retención, funciones más usadas, hogares), **Asesor IA** (consultas, costo estimado, usuarios que más la usan), **Usuarios** (tabla con búsqueda y paginación).
3. Arriba: periodo (7, 30, 90 días o fechas personalizadas), **Actualizar** y **Exportar CSV** (reporte completo con usuarios).

## Cómo leer algunos datos
- **Embudo:** visitantes y clics se miden por sesión anónima; cuentas y movimientos son de usuarios creados dentro del periodo.
- **Usuario activo:** el que registró movimientos (activos hoy, 7 y 30 días; en el embudo, 2 o más días de uso).
- **Retención:** de los usuarios con más de 7 (o 30) días de antigüedad, cuántos registraron movimientos después de ese tiempo.
- **Costo IA:** es una estimación (consultas × costo por consulta que escribes). El gasto real está en la consola de Anthropic.
- Las funciones más usadas y el mapa de calor empiezan a llenarse **desde que publiques la v6**; antes no existían esos eventos.

## Privacidad
Las visitas se guardan de forma anónima (sin IP ni cookies). La tabla de usuarios muestra correos, solo para tu cuenta de administrador (la protege Supabase, no el navegador).

## Solución de problemas
- "Falta actualizar supabase/admin.sql": repite el Paso 2.
- "Tu cuenta no es administradora": revisa que el correo de la última línea de `admin.sql` sea exactamente el de tu cuenta y vuelve a ejecutarlo.
- Los gráficos del administrador salen vacíos al principio: es normal; se llenan con el uso.
- Se ve el diseño anterior: Ctrl+F5 o borra la caché del navegador.
