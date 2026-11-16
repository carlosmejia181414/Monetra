-- ============================================================
-- Monetra v3 - ACTUALIZACIÓN para instalaciones existentes (agrega francés)
-- Supabase > SQL Editor > New query > pega todo > Run
-- NO borra datos. Solo cambia las categorías iniciales de cuentas y hogares NUEVOS.
-- ============================================================
-- Categorías iniciales según el idioma (es / en / fr)
create or replace function public.seed_categories(p_user uuid, p_household uuid, p_lang text)
returns void language plpgsql security definer set search_path = public as $$
declare n text[];
begin
  n := case
    when coalesce(p_lang, 'es') ~* '^en' then array['Salary','Extra income','Rent','Internet','Phone','Food','Gas','Health']
    when coalesce(p_lang, 'es') ~* '^fr' then array['Salaire','Revenu extra','Loyer','Internet','Téléphone','Alimentation','Essence','Santé']
    else array['Salario','Ingreso extra','Renta','Internet','Celular','Comida','Gasolina','Salud']
  end;
  insert into public.categories (user_id, household_id, name, kind) values
    (p_user, p_household, n[1], 'income'),  (p_user, p_household, n[2], 'income'),
    (p_user, p_household, n[3], 'fixed'),   (p_user, p_household, n[4], 'fixed'),   (p_user, p_household, n[5], 'fixed'),
    (p_user, p_household, n[6], 'variable'),(p_user, p_household, n[7], 'variable'),(p_user, p_household, n[8], 'variable')
  on conflict do nothing;
end $$;
revoke all on function public.seed_categories(uuid, uuid, text) from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.seed_categories(new.id, null,
    coalesce(new.raw_user_meta_data->>'lang', new.raw_user_meta_data->>'locale', 'es'));
  return new;
end $$;

create or replace function public.create_household(p_name text, p_lang text default 'es')
returns uuid language plpgsql security definer set search_path = public as $$
declare h uuid; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from household_members where user_id = uid) then raise exception 'already_in_household'; end if;
  insert into households (name, owner_id) values (coalesce(nullif(trim(p_name), ''), 'Hogar'), uid) returning id into h;
  insert into household_members (household_id, user_id) values (h, uid);
  perform public.seed_categories(uid, h, p_lang);
  return h;
end $$;
