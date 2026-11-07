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
-- Monetra: límite diario de consultas al asesor IA (lo usa la función ai-advisor).
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  count int not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
-- Sin políticas: solo la función (service role) puede leer/escribir.

create or replace function public.ai_consume(p_user uuid, p_limit int)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into public.ai_usage(user_id, day, count) values (p_user, current_date, 1)
  on conflict (user_id, day) do update set count = public.ai_usage.count + 1
  returning count into n;
  if n > p_limit then
    update public.ai_usage set count = p_limit where user_id = p_user and day = current_date;
    return false;
  end if;
  return true;
end $$;

revoke all on function public.ai_consume(uuid, int) from public, anon, authenticated;
grant execute on function public.ai_consume(uuid, int) to service_role;
grant select, insert, update on public.ai_usage to service_role;
-- Monetra: panel de administrador y métricas anónimas.
create table if not exists public.admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.admins enable row level security;
drop policy if exists "admin ve su fila" on public.admins;
create policy "admin ve su fila" on public.admins for select to authenticated using (user_id = auth.uid());
grant select on public.admins to authenticated;

create table if not exists public.page_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  event text not null check (char_length(event) <= 40),
  path text not null default '' check (char_length(path) <= 60),
  lang text not null default '' check (char_length(lang) <= 5),
  device text not null default '' check (device in ('mobile','desktop','')),
  referrer text not null default '' check (char_length(referrer) <= 80),
  session_id text not null default '' check (char_length(session_id) <= 40)
);
create index if not exists page_events_created_idx on public.page_events (created_at desc);
alter table public.page_events enable row level security;
drop policy if exists "cualquiera registra eventos" on public.page_events;
create policy "cualquiera registra eventos" on public.page_events for insert to anon, authenticated with check (true);
grant insert on public.page_events to anon, authenticated;


-- Si venías de la v5 se reemplaza la función anterior.
drop function if exists public.admin_stats(int);

-- Totales de un periodo (uso interno).
create or replace function public._admin_period(p_from date, p_to date)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'visits',        (select count(*) from public.page_events where event='page_view' and path='index.html' and created_at::date between p_from and p_to),
    'visitors',      (select count(distinct session_id) from public.page_events where event='page_view' and created_at::date between p_from and p_to),
    'signups',       (select count(*) from auth.users where created_at::date between p_from and p_to),
    'signup_clicks', (select count(*) from public.page_events where event='click_signup' and created_at::date between p_from and p_to),
    'app_opens',     (select count(*) from public.page_events where event='app_open' and created_at::date between p_from and p_to),
    'downloads',     (select count(*) from public.page_events where event in ('download_brochure','download_manual') and created_at::date between p_from and p_to),
    'ai_queries',    (select coalesce(sum(count),0) from public.ai_usage where day between p_from and p_to),
    'transactions',  (select count(*) from public.transactions where created_at::date between p_from and p_to),
    'active_users',  (select count(distinct user_id) from public.transactions where created_at::date between p_from and p_to)
  )
$$;
revoke all on function public._admin_period(date, date) from public, anon, authenticated;

create or replace function public.admin_stats(p_from date default current_date - 29, p_to date default current_date, p_tz text default 'UTC')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_f date := least(p_from, p_to); v_t date := greatest(p_from, p_to);
  v_n int; v_pf date; v_pt date; v_r jsonb;
begin
  if not exists (select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if v_t - v_f > 365 then v_f := v_t - 365; end if;
  v_n := v_t - v_f + 1; v_pt := v_f - 1; v_pf := v_f - v_n;
  perform now() at time zone p_tz;  -- valida la zona horaria

  select jsonb_build_object(
    'range', jsonb_build_object('from', v_f, 'to', v_t, 'days', v_n),
    'cur',  public._admin_period(v_f, v_t),
    'prev', public._admin_period(v_pf, v_pt),
    'all', jsonb_build_object(
      'users', (select count(*) from auth.users),
      'transactions', (select count(*) from public.transactions),
      'households', (select count(*) from public.households),
      'users_with_tx', (select count(distinct user_id) from public.transactions),
      'avg_tx_per_user', (select coalesce(round(count(*)::numeric / nullif(count(distinct user_id),0), 1), 0) from public.transactions),
      'dau', (select count(distinct user_id) from public.transactions where created_at >= date_trunc('day', now())),
      'wau', (select count(distinct user_id) from public.transactions where created_at >= now() - interval '7 days'),
      'mau', (select count(distinct user_id) from public.transactions where created_at >= now() - interval '30 days')
    ),
    'funnel', jsonb_build_object(
      'visitors', (select count(distinct session_id) from public.page_events where event='page_view' and created_at::date between v_f and v_t),
      'signup_click', (select count(distinct session_id) from public.page_events where event='click_signup' and created_at::date between v_f and v_t),
      'accounts', (select count(*) from auth.users where created_at::date between v_f and v_t),
      'first_tx', (select count(*) from auth.users u where u.created_at::date between v_f and v_t and exists (select 1 from public.transactions x where x.user_id = u.id)),
      'active', (select count(*) from auth.users u where u.created_at::date between v_f and v_t and (select count(distinct x.created_at::date) from public.transactions x where x.user_id = u.id) >= 2)
    ),
    'retention', jsonb_build_object(
      'd7_base', (select count(*) from auth.users where created_at <= now() - interval '7 days'),
      'd7_kept', (select count(*) from auth.users u where u.created_at <= now() - interval '7 days' and exists (select 1 from public.transactions x where x.user_id = u.id and x.created_at >= u.created_at + interval '7 days')),
      'd30_base', (select count(*) from auth.users where created_at <= now() - interval '30 days'),
      'd30_kept', (select count(*) from auth.users u where u.created_at <= now() - interval '30 days' and exists (select 1 from public.transactions x where x.user_id = u.id and x.created_at >= u.created_at + interval '30 days'))
    ),
    'daily', (select coalesce(jsonb_agg(x order by x.day), '[]'::jsonb) from (
       select g::date as day,
         (select count(*) from public.page_events e where e.event='page_view' and e.path='index.html' and e.created_at::date = g::date) as visits,
         (select count(distinct session_id) from public.page_events e where e.event='page_view' and e.created_at::date = g::date) as visitors,
         (select count(*) from auth.users u where u.created_at::date = g::date) as signups,
         (select count(distinct user_id) from public.transactions x where x.created_at::date = g::date) as active,
         (select coalesce(sum(count),0) from public.ai_usage a where a.day = g::date) as ai
       from generate_series(v_f, v_t, interval '1 day') g) x),
    'heatmap', (select coalesce(jsonb_agg(jsonb_build_object('dow', dow, 'hour', hr, 'n', n)), '[]'::jsonb) from (
       select extract(dow from created_at at time zone p_tz)::int dow, extract(hour from created_at at time zone p_tz)::int hr, count(*) n
       from public.page_events where event in ('page_view','app_open') and created_at::date between v_f and v_t group by 1,2) q),
    'features', (select coalesce(jsonb_agg(jsonb_build_object('event', event, 'n', n) order by n desc), '[]'::jsonb) from (
       select event, count(*) n from public.page_events
       where created_at::date between v_f and v_t and (event like 'tab\_%' or event in ('export_data','import_data','ai_advice','theme_toggle'))
       group by event) q),
    'events', (select coalesce(jsonb_agg(jsonb_build_object('event', event, 'n', n) order by n desc), '[]'::jsonb) from (
       select event, count(*) n from public.page_events where created_at::date between v_f and v_t group by event) q),
    'langs', (select coalesce(jsonb_agg(jsonb_build_object('lang', lang, 'n', n) order by n desc), '[]'::jsonb) from (
       select lang, count(*) n from public.page_events where event='page_view' and created_at::date between v_f and v_t group by lang) q),
    'devices', (select coalesce(jsonb_agg(jsonb_build_object('device', device, 'n', n) order by n desc), '[]'::jsonb) from (
       select device, count(*) n from public.page_events where event='page_view' and created_at::date between v_f and v_t group by device) q),
    'referrers', (select coalesce(jsonb_agg(jsonb_build_object('referrer', referrer, 'n', n) order by n desc), '[]'::jsonb) from (
       select coalesce(nullif(referrer,''),'(directo)') referrer, count(*) n from public.page_events where event='page_view' and created_at::date between v_f and v_t group by 1 order by 2 desc limit 8) q),
    'providers', (select coalesce(jsonb_agg(jsonb_build_object('provider', p, 'n', n) order by n desc), '[]'::jsonb) from (
       select coalesce(raw_app_meta_data->>'provider','email') p, count(*) n from auth.users group by 1) q),
    'ai_top', (select coalesce(jsonb_agg(jsonb_build_object('email', email, 'n', n) order by n desc), '[]'::jsonb) from (
       select u.email, sum(a.count) n from public.ai_usage a join auth.users u on u.id = a.user_id
       where a.day between v_f and v_t group by u.email order by 2 desc limit 8) q),
    'ai_users', (select count(distinct user_id) from public.ai_usage where day between v_f and v_t),
    'household_sizes', (select coalesce(jsonb_agg(jsonb_build_object('size', size, 'n', n) order by size), '[]'::jsonb) from (
       select size, count(*) n from (select household_id, count(*) size from public.household_members group by household_id) h group by size) q),
    'inactive_new', (select count(*) from auth.users u where u.created_at >= now() - interval '14 days' and not exists (select 1 from public.transactions x where x.user_id = u.id))
  ) into v_r;
  return v_r;
end $$;
revoke all on function public.admin_stats(date, date, text) from public, anon;
grant execute on function public.admin_stats(date, date, text) to authenticated;

-- Lista de usuarios (solo administrador).
create or replace function public.admin_users(p_limit int default 25, p_offset int default 0, p_search text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb; lim int := greatest(1, least(coalesce(p_limit,25), 1000)); q text := '%' || coalesce(p_search,'') || '%';
begin
  if not exists (select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'total', (select count(*) from auth.users where email ilike q),
    'rows', coalesce((select jsonb_agg(x) from (
      select u.email, u.created_at, u.last_sign_in_at,
        coalesce(u.raw_app_meta_data->>'provider','email') as provider,
        (select count(*) from public.transactions t where t.user_id = u.id) as tx_count,
        (select max(t.created_at) from public.transactions t where t.user_id = u.id) as last_tx,
        exists (select 1 from public.household_members h where h.user_id = u.id) as in_household,
        (select coalesce(sum(a.count),0) from public.ai_usage a where a.user_id = u.id and a.day >= current_date - 30) as ai_30d
      from auth.users u where u.email ilike q order by u.created_at desc limit lim offset greatest(coalesce(p_offset,0),0)) x), '[]'::jsonb)
  ) into r;
  return r;
end $$;
revoke all on function public.admin_users(int, int, text) from public, anon;
grant execute on function public.admin_users(int, int, text) to authenticated;

-- Para ser administrador, cambia el correo y ejecuta esta línea (una sola vez):
insert into public.admins(user_id) select id from auth.users where email = 'TU-CORREO@ejemplo.com' on conflict do nothing;
