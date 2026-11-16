-- ============================================================
-- Monetra v9 - última recomendación del Asesor IA, país de visitas/registros y agente de la landing
-- Supabase > SQL Editor > New query > pega TODO > Run. Se puede ejecutar más de una vez.
-- Requiere haber ejecutado antes: setup.sql, admin.sql y plan.sql.
-- ============================================================

-- 1) Última recomendación del Asesor IA (una sola fila por usuario: la nueva reemplaza a la anterior)
create table if not exists public.ai_last (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  advice     text not null,
  month      text,
  lang       text,
  created_at timestamptz not null default now()
);
alter table public.ai_last enable row level security;
drop policy if exists ai_last_select on public.ai_last;
drop policy if exists ai_last_insert on public.ai_last;
drop policy if exists ai_last_update on public.ai_last;
drop policy if exists ai_last_delete on public.ai_last;
create policy ai_last_select on public.ai_last for select to authenticated using (user_id = auth.uid());
create policy ai_last_insert on public.ai_last for insert to authenticated with check (user_id = auth.uid());
create policy ai_last_update on public.ai_last for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ai_last_delete on public.ai_last for delete to authenticated using (user_id = auth.uid());
grant select, insert, update, delete on public.ai_last to authenticated;

-- 2) País (solo código de 2 letras, nunca la IP) en las visitas y en las cuentas
alter table public.page_events add column if not exists country text not null default '';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'page_events_country_chk') then
    alter table public.page_events add constraint page_events_country_chk check (country ~ '^([A-Z]{2})?$');
  end if;
end $$;
create index if not exists page_events_country_idx on public.page_events (country);

create table if not exists public.user_country (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  country    text not null check (country ~ '^[A-Z]{2}$'),
  created_at timestamptz not null default now()
);
alter table public.user_country enable row level security;
-- Sin políticas: solo se escribe con la función de abajo y solo la lee el administrador (vía admin_stats).

-- Guarda el país la PRIMERA vez que el usuario entra (no se sobrescribe).
create or replace function public.set_my_country(p_country text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or p_country is null or p_country !~ '^[A-Za-z]{2}$' then return; end if;
  insert into public.user_country(user_id, country) values (auth.uid(), upper(p_country)) on conflict (user_id) do nothing;
end $$;
revoke all on function public.set_my_country(text) from public, anon;
grant execute on function public.set_my_country(text) to authenticated;

-- 3) Estadísticas por país para el administrador (visitantes únicos y cuentas creadas)

create or replace function public.admin_geo(p_from date default current_date - 29, p_to date default current_date)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_f date := least(p_from, p_to); v_t date := greatest(p_from, p_to);
begin
  if not exists (select 1 from public.admins where user_id = auth.uid()) then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if v_t - v_f > 365 then v_f := v_t - 365; end if;
  return jsonb_build_object(
    'visit_countries', (select coalesce(jsonb_agg(jsonb_build_object('country', c, 'visitors', n) order by n desc), '[]'::jsonb) from (
       select coalesce(nullif(country,''),'??') c, count(distinct session_id) n from public.page_events
       where event='page_view' and created_at::date between v_f and v_t group by 1 order by 2 desc limit 30) q),
    'signup_countries', (select coalesce(jsonb_agg(jsonb_build_object('country', c, 'n', n) order by n desc), '[]'::jsonb) from (
       select coalesce(uc.country,'??') c, count(*) n from auth.users u left join public.user_country uc on uc.user_id = u.id
       where u.created_at::date between v_f and v_t group by 1 order by 2 desc limit 30) q)
  );
end $$;
revoke all on function public.admin_geo(date, date) from public, anon;
grant execute on function public.admin_geo(date, date) to authenticated;

-- 4) Límite de uso del agente de la landing (sin guardar IPs: solo una huella anónima por día)
create table if not exists public.site_chat_usage (
  day date not null default current_date,
  who text not null,
  count int not null default 0,
  primary key (day, who)
);
alter table public.site_chat_usage enable row level security;
-- Sin políticas: solo la función (service role).

create or replace function public.site_chat_consume(p_who text, p_limit int, p_global int)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int; g int;
begin
  delete from public.site_chat_usage where day < current_date - 3;
  select coalesce(sum(count),0) into g from public.site_chat_usage where day = current_date;
  if g >= p_global then return false; end if;
  insert into public.site_chat_usage(day, who, count) values (current_date, p_who, 1)
  on conflict (day, who) do update set count = public.site_chat_usage.count + 1
  returning count into n;
  if n > p_limit then
    update public.site_chat_usage set count = p_limit where day = current_date and who = p_who;
    return false;
  end if;
  return true;
end $$;
revoke all on function public.site_chat_consume(text, int, int) from public, anon, authenticated;
grant execute on function public.site_chat_consume(text, int, int) to service_role;
grant select, insert, update, delete on public.site_chat_usage to service_role;
