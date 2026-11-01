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

-- Categorías iniciales para cada usuario nuevo (en su idioma de registro)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare en boolean := coalesce(new.raw_user_meta_data->>'lang', 'es') = 'en';
begin
  insert into public.categories (user_id, name, kind) values
    (new.id, case when en then 'Salary' else 'Salario' end, 'income'),
    (new.id, case when en then 'Extra income' else 'Ingreso extra' end, 'income'),
    (new.id, case when en then 'Rent' else 'Renta' end, 'fixed'),
    (new.id, 'Internet', 'fixed'),
    (new.id, case when en then 'Phone' else 'Celular' end, 'fixed'),
    (new.id, case when en then 'Food' else 'Comida' end, 'variable'),
    (new.id, case when en then 'Gas' else 'Gasolina' end, 'variable'),
    (new.id, case when en then 'Health' else 'Salud' end, 'variable');
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

do $$ begin
  begin alter publication supabase_realtime add table public.categories;   exception when others then null; end;
  begin alter publication supabase_realtime add table public.transactions; exception when others then null; end;
end $$;
