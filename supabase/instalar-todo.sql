-- ============================================================
-- Mi Balance v2 - cuentas individuales (cada usuario ve solo SUS datos)
-- Supabase > SQL Editor > New query > pega todo > Run
-- ATENCIÓN: borra las tablas anteriores (movimientos y categorías) si ya existían.
-- ============================================================
drop table if exists public.transactions cascade;
drop table if exists public.categories cascade;
drop table if exists public.members cascade;
drop function if exists public.is_member();

create table public.categories (
  id      text primary key default gen_random_uuid()::text,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name    text not null,
  kind    text not null check (kind in ('income','fixed','variable'))
);
create unique index categories_user_name_kind on public.categories (user_id, lower(name), kind);

create table public.transactions (
  id                  text primary key default gen_random_uuid()::text,
  user_id             uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date                date not null,
  type                text not null,
  category_id         text not null references public.categories(id) on delete restrict,
  amount              numeric(14,2) not null,
  description         text not null default '',
  parent_recurring_id text,
  override_year       int,
  override_month      int,
  created_at          timestamptz not null default now()
);
create index on public.transactions (user_id, date);
create index on public.transactions (category_id);

alter table public.categories   enable row level security;
alter table public.transactions enable row level security;

create policy "own_categories" on public.categories
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own_transactions" on public.transactions
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

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

-- Categorías iniciales para cada usuario nuevo (en su idioma de registro)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.seed_categories(new.id, null,
    coalesce(new.raw_user_meta_data->>'lang', new.raw_user_meta_data->>'locale', 'es'));
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

do $$ begin
  begin alter publication supabase_realtime add table public.categories;   exception when others then null; end;
  begin alter publication supabase_realtime add table public.transactions; exception when others then null; end;
end $$;


-- ============================================================
-- Mi Balance - MODO HOGAR (varias personas comparten los mismos datos)
-- Ejecútalo DESPUÉS de setup.sql. No borra datos existentes.
-- ============================================================
create table if not exists public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);
create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id      uuid not null unique references auth.users(id) on delete cascade,
  primary key (household_id, user_id)
);

alter table public.categories   add column if not exists household_id uuid references public.households(id) on delete cascade;
alter table public.transactions add column if not exists household_id uuid references public.households(id) on delete cascade;
create index if not exists categories_household_idx   on public.categories (household_id);
create index if not exists transactions_household_idx on public.transactions (household_id, date);

drop index if exists public.categories_user_name_kind;
create unique index if not exists categories_scope_name_kind
  on public.categories ((coalesce(household_id::text, user_id::text)), lower(name), kind);

create or replace function public.is_household_member(h uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.household_members where household_id = h and user_id = auth.uid());
$$;
revoke all on function public.is_household_member(uuid) from public, anon;
grant execute on function public.is_household_member(uuid) to authenticated;

alter table public.households        enable row level security;
alter table public.household_members enable row level security;
drop policy if exists "hh_read" on public.households;
create policy "hh_read" on public.households for select to authenticated using (public.is_household_member(id));
drop policy if exists "hm_read" on public.household_members;
create policy "hm_read" on public.household_members for select to authenticated using (public.is_household_member(household_id));

drop policy if exists "own_categories"    on public.categories;
drop policy if exists "scoped_categories" on public.categories;
create policy "scoped_categories" on public.categories for all to authenticated
  using ((household_id is null and user_id = (select auth.uid())) or (household_id is not null and public.is_household_member(household_id)))
  with check ((household_id is null and user_id = (select auth.uid())) or (household_id is not null and public.is_household_member(household_id)));

drop policy if exists "own_transactions"    on public.transactions;
drop policy if exists "scoped_transactions" on public.transactions;
create policy "scoped_transactions" on public.transactions for all to authenticated
  using ((household_id is null and user_id = (select auth.uid())) or (household_id is not null and public.is_household_member(household_id)))
  with check ((household_id is null and user_id = (select auth.uid())) or (household_id is not null and public.is_household_member(household_id)));

-- Crear un hogar (queda como único miembro, con categorías iniciales propias)
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

-- Unirse a un hogar con su código de invitación
create or replace function public.join_household(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare h uuid; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from household_members where user_id = uid) then raise exception 'already_in_household'; end if;
  select id into h from households where invite_code = upper(trim(p_code));
  if h is null then raise exception 'invalid_code'; end if;
  insert into household_members (household_id, user_id) values (h, uid);
  return h;
end $$;

-- Salir del hogar (si queda vacío, se elimina con sus datos)
create or replace function public.leave_household()
returns void language plpgsql security definer set search_path = public as $$
declare h uuid;
begin
  delete from household_members where user_id = auth.uid() returning household_id into h;
  if h is not null and not exists (select 1 from household_members where household_id = h) then
    delete from households where id = h;
  end if;
end $$;

revoke all on function public.create_household(text, text), public.join_household(text), public.leave_household() from public, anon;
grant execute on function public.create_household(text, text), public.join_household(text), public.leave_household() to authenticated;


-- ============================================================
-- Monetra - PERFIL (nombre para mostrar y foto)
-- Supabase > SQL Editor > New query > pega todo > Run. No borra datos. Se puede ejecutar varias veces.
-- ============================================================
create table if not exists public.profiles (
  user_id      uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 60),
  avatar_url   text,
  updated_at   timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists "profiles_own_select" on public.profiles;
create policy "profiles_own_select" on public.profiles for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "profiles_own_insert" on public.profiles;
create policy "profiles_own_insert" on public.profiles for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "profiles_own_update" on public.profiles;
create policy "profiles_own_update" on public.profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Almacenamiento de fotos de perfil (carpeta por usuario, máx. 2 MB, solo imágenes)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2097152,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "avatars_own_select" on storage.objects;
create policy "avatars_own_select" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "avatars_own_insert" on storage.objects;
create policy "avatars_own_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "avatars_own_update" on storage.objects;
create policy "avatars_own_update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "avatars_own_delete" on storage.objects;
create policy "avatars_own_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
