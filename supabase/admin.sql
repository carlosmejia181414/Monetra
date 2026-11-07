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
