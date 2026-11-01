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
declare h uuid; uid uuid := auth.uid(); en boolean := p_lang = 'en';
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from household_members where user_id = uid) then raise exception 'already_in_household'; end if;
  insert into households (name, owner_id) values (coalesce(nullif(trim(p_name), ''), 'Hogar'), uid) returning id into h;
  insert into household_members (household_id, user_id) values (h, uid);
  insert into categories (user_id, household_id, name, kind) values
    (uid, h, case when en then 'Salary' else 'Salario' end, 'income'),
    (uid, h, case when en then 'Extra income' else 'Ingreso extra' end, 'income'),
    (uid, h, case when en then 'Rent' else 'Renta' end, 'fixed'),
    (uid, h, 'Internet', 'fixed'),
    (uid, h, case when en then 'Phone' else 'Celular' end, 'fixed'),
    (uid, h, case when en then 'Food' else 'Comida' end, 'variable'),
    (uid, h, case when en then 'Gas' else 'Gasolina' end, 'variable'),
    (uid, h, case when en then 'Health' else 'Salud' end, 'variable');
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
