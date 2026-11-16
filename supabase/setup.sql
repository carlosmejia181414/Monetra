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
