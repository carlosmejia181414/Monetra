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

create or replace function public.admin_stats(p_days int default 30)
returns jsonb language plpgsql security definer set search_path = public as $$
declare d int := greatest(1, least(coalesce(p_days,30), 365)); since timestamptz; r jsonb;
begin
  if not exists (select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  since := now() - make_interval(days => d);
  select jsonb_build_object(
    'days', d,
    'totals', jsonb_build_object(
      'users', (select count(*) from auth.users),
      'new_users', (select count(*) from auth.users where created_at >= since),
      'transactions', (select count(*) from public.transactions),
      'households', (select count(*) from public.households),
      'visits', (select count(*) from public.page_events where event='page_view' and path='index.html' and created_at >= since),
      'visitors', (select count(distinct session_id) from public.page_events where event='page_view' and created_at >= since),
      'signup_clicks', (select count(*) from public.page_events where event='click_signup' and created_at >= since),
      'app_opens', (select count(*) from public.page_events where event='app_open' and created_at >= since),
      'downloads', (select count(*) from public.page_events where event in ('download_brochure','download_manual') and created_at >= since),
      'ai_queries', (select coalesce(sum(count),0) from public.ai_usage where day >= current_date - d)
    ),
    'daily', (select coalesce(jsonb_agg(x order by x.day), '[]'::jsonb) from (
       select g::date as day,
         (select count(*) from public.page_events e where e.event='page_view' and e.created_at::date = g::date) as visits,
         (select count(distinct session_id) from public.page_events e where e.event='page_view' and e.created_at::date = g::date) as visitors,
         (select count(*) from auth.users u where u.created_at::date = g::date) as signups
       from generate_series((current_date - (d-1)), current_date, interval '1 day') g) x),
    'events', (select coalesce(jsonb_agg(jsonb_build_object('event', event, 'n', n) order by n desc), '[]'::jsonb) from (
       select event, count(*) n from public.page_events where created_at >= since group by event) q),
    'langs', (select coalesce(jsonb_agg(jsonb_build_object('lang', lang, 'n', n) order by n desc), '[]'::jsonb) from (
       select lang, count(*) n from public.page_events where event='page_view' and created_at >= since group by lang) q),
    'devices', (select coalesce(jsonb_agg(jsonb_build_object('device', device, 'n', n) order by n desc), '[]'::jsonb) from (
       select device, count(*) n from public.page_events where event='page_view' and created_at >= since group by device) q),
    'referrers', (select coalesce(jsonb_agg(jsonb_build_object('referrer', referrer, 'n', n) order by n desc), '[]'::jsonb) from (
       select coalesce(nullif(referrer,''),'(directo)') referrer, count(*) n from public.page_events where event='page_view' and created_at >= since group by 1 order by 2 desc limit 8) q),
    'pages', (select coalesce(jsonb_agg(jsonb_build_object('path', path, 'n', n) order by n desc), '[]'::jsonb) from (
       select path, count(*) n from public.page_events where event='page_view' and created_at >= since group by path) q),
    'providers', (select coalesce(jsonb_agg(jsonb_build_object('provider', p, 'n', n) order by n desc), '[]'::jsonb) from (
       select coalesce(raw_app_meta_data->>'provider','email') p, count(*) n from auth.users group by 1) q)
  ) into r;
  return r;
end $$;
revoke all on function public.admin_stats(int) from public, anon;
grant execute on function public.admin_stats(int) to authenticated;

-- Para ser administrador, cambia el correo y ejecuta esta línea (una sola vez):
insert into public.admins(user_id) select id from auth.users where email = 'TU-CORREO@ejemplo.com' on conflict do nothing;
