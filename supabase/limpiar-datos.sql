-- ============================================================
-- Monetra - LIMPIAR TODOS LOS DATOS (dejar la base en cero para la marcha blanca)
-- Supabase > SQL Editor > New query > pega todo > cambia el correo de abajo > Run
--
-- BORRA (no se puede deshacer):
--   * todos los movimientos y categorías
--   * todos los hogares y sus miembros
--   * el uso del Asesor IA y las visitas/eventos del administrador
--   * TODAS las cuentas de usuario, excepto la tuya
-- CONSERVA: la estructura (tablas, funciones, políticas), tu cuenta, tu perfil
--   y tu permiso de administrador. Tu cuenta queda con las categorías iniciales.
-- ============================================================
do $$
declare
  v_correo text := 'TU-CORREO@ejemplo.com';   -- <<< CAMBIA ESTO: la cuenta que se conserva
  v_keep   uuid;
begin
  select id into v_keep from auth.users where lower(email) = lower(v_correo);
  if v_keep is null then
    raise exception 'No existe ninguna cuenta con el correo %. Cambia v_correo y vuelve a ejecutar (no se borró nada).', v_correo;
  end if;

  -- 1) Datos de la app
  delete from public.transactions;
  delete from public.categories;
  delete from public.household_members;
  delete from public.households;
  delete from public.ai_usage;
  delete from public.page_events;

  -- 2) Cuentas de usuario (borra en cascada perfiles, permisos de admin e identidades de los demás)
  delete from auth.users where id <> v_keep;

  -- 3) Categorías iniciales para tu cuenta
  perform public.seed_categories(v_keep, null, 'es');

  -- 4) Te aseguras de seguir como administrador
  insert into public.admins (user_id) values (v_keep) on conflict do nothing;

  raise notice 'Listo. Base en cero. Cuenta conservada: %', v_correo;
end $$;

-- Verificación: todo debería dar 0 (categorías = 8 de tu cuenta, usuarios = 1)
select
  (select count(*) from public.transactions)       as movimientos,
  (select count(*) from public.categories)         as categorias,
  (select count(*) from public.households)         as hogares,
  (select count(*) from public.page_events)        as eventos,
  (select count(*) from auth.users)                as usuarios;

-- Las fotos de perfil guardadas NO se borran con SQL (Supabase lo bloquea):
-- si quieres, entra a Storage > avatars y elimina las carpetas de los demás usuarios.
