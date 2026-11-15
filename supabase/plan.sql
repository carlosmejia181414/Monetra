-- ============================================================
-- Monetra v8 - Planes Gratis / Pro, moneda y escaneo de boletas
-- Supabase > SQL Editor > New query > pega TODO > Run. Se puede ejecutar más de una vez.
-- Requiere haber ejecutado antes: setup.sql, hogar.sql, perfil.sql, ia.sql y admin.sql.
-- ============================================================

-- 1) Plan de cada usuario. Los usuarios NO pueden escribir aquí (solo las funciones de abajo).
create table if not exists public.user_plans (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  plan       text not null default 'free' check (plan in ('free','pro')),
  pro_until  timestamptz,                       -- null = sin vencimiento
  trial_used boolean not null default false,
  source     text not null default 'trial' check (source in ('trial','admin','stripe')),
  updated_at timestamptz not null default now()
);
alter table public.user_plans enable row level security;
-- sin políticas: nadie lee ni escribe directo; se usa my_plan()

-- 2) Moneda preferida (perfil) y moneda de cada movimiento
alter table public.profiles     add column if not exists currency text;
alter table public.transactions add column if not exists currency text;
do $$ begin
  begin alter table public.profiles     add constraint profiles_currency_chk     check (currency is null or currency ~ '^[A-Z]{3}$'); exception when duplicate_object then null; end;
  begin alter table public.transactions add constraint transactions_currency_chk check (currency is null or currency ~ '^[A-Z]{3}$'); exception when duplicate_object then null; end;
end $$;

-- 3) Uso mensual del escaneo de boletas (fase 2)
create table if not exists public.scan_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day     date not null default current_date,
  count   int  not null default 0,
  primary key (user_id, day)
);
alter table public.scan_usage enable row level security;

-- 4) Plan efectivo de un usuario: 'pro' solo si está vigente
create or replace function public.plan_of(p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  select case when exists (
    select 1 from public.user_plans
    where user_id = p_user and plan = 'pro' and (pro_until is null or pro_until > now())
  ) then 'pro' else 'free' end
$$;
revoke all on function public.plan_of(uuid) from public, anon, authenticated;
grant execute on function public.plan_of(uuid) to service_role;

-- 5) Estado del plan del usuario actual. Los usuarios que aún no tienen fila reciben 14 días de prueba Pro.
create or replace function public.my_plan()
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); up public.user_plans%rowtype; eff text; v_ai int; v_sc int;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  insert into public.user_plans(user_id, plan, pro_until, trial_used, source)
    values (uid, 'pro', now() + interval '14 days', true, 'trial')
    on conflict (user_id) do nothing;
  select * into up from public.user_plans where user_id = uid;
  eff := public.plan_of(uid);
  select coalesce(sum(count),0) into v_ai from public.ai_usage   where user_id = uid and day >= date_trunc('month', current_date)::date;
  select coalesce(sum(count),0) into v_sc from public.scan_usage where user_id = uid and day >= date_trunc('month', current_date)::date;
  return jsonb_build_object(
    'plan', eff, 'pro_until', up.pro_until, 'source', up.source, 'trial_used', up.trial_used,
    'ai_month', v_ai, 'scans_month', v_sc,
    'limits', jsonb_build_object(
      'categories', case when eff = 'pro' then null else 12 end,
      'ai_month',   case when eff = 'pro' then null else 3 end,
      'scans_month', case when eff = 'pro' then 100 else 3 end,
      'history_months', case when eff = 'pro' then null else 3 end));
end $$;
revoke all on function public.my_plan() from public, anon;
grant execute on function public.my_plan() to authenticated;

-- 6) Límite de categorías en Gratis (12 en total; las 8 iniciales cuentan)
create or replace function public.enforce_category_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or new.household_id is not null then return new; end if;
  if public.plan_of(auth.uid()) <> 'pro'
     and (select count(*) from public.categories where user_id = auth.uid() and household_id is null) >= 12 then
    raise exception 'limit_categories';
  end if;
  return new;
end $$;
drop trigger if exists categories_limit on public.categories;
create trigger categories_limit before insert on public.categories
  for each row execute function public.enforce_category_limit();

-- 7) Crear un hogar requiere Pro (unirse con un código sigue siendo gratis)
create or replace function public.create_household(p_name text, p_lang text default 'es')
returns uuid language plpgsql security definer set search_path = public as $$
declare h uuid; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if public.plan_of(uid) <> 'pro' then raise exception 'pro_required'; end if;
  if exists (select 1 from household_members where user_id = uid) then raise exception 'already_in_household'; end if;
  insert into households (name, owner_id) values (coalesce(nullif(trim(p_name), ''), 'Hogar'), uid) returning id into h;
  insert into household_members (household_id, user_id) values (h, uid);
  perform public.seed_categories(uid, h, p_lang);
  return h;
end $$;
revoke all on function public.create_household(text, text) from public, anon;
grant execute on function public.create_household(text, text) to authenticated;

-- 8) Asesor IA: Gratis = 3 consultas al mes; Pro = el límite diario de la función
create or replace function public.ai_consume(p_user uuid, p_limit int)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int; m int;
begin
  if public.plan_of(p_user) <> 'pro' then
    select coalesce(sum(count),0) into m from public.ai_usage where user_id = p_user and day >= date_trunc('month', current_date)::date;
    if m >= 3 then return false; end if;
  end if;
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

-- 9) Escaneo de boletas: límite mensual (Gratis 3, Pro p_pro_limit). La usa la función receipt-scan.
create or replace function public.scan_consume(p_user uuid, p_pro_limit int default 100)
returns boolean language plpgsql security definer set search_path = public as $$
declare lim int := case when public.plan_of(p_user) = 'pro' then p_pro_limit else 3 end; m int;
begin
  select coalesce(sum(count),0) into m from public.scan_usage where user_id = p_user and day >= date_trunc('month', current_date)::date;
  if m >= lim then return false; end if;
  insert into public.scan_usage(user_id, day, count) values (p_user, current_date, 1)
  on conflict (user_id, day) do update set count = public.scan_usage.count + 1;
  return true;
end $$;
revoke all on function public.scan_consume(uuid, int) from public, anon, authenticated;
grant execute on function public.scan_consume(uuid, int) to service_role;

-- Devuelve el escaneo si la lectura falló (no se cobra al usuario un intento fallido)
create or replace function public.scan_refund(p_user uuid)
returns void language sql security definer set search_path = public as $$
  update public.scan_usage set count = greatest(count - 1, 0) where user_id = p_user and day = current_date;
$$;
revoke all on function public.scan_refund(uuid) from public, anon, authenticated;
grant execute on function public.scan_refund(uuid) to service_role;
grant select, insert, update on public.scan_usage, public.user_plans to service_role;

-- 10) Administrador: ver y cambiar planes
create or replace function public.admin_plans()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.admins where user_id = auth.uid()) then raise exception 'not_admin' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('email', u.email, 'plan', public.plan_of(p.user_id), 'pro_until', p.pro_until, 'source', p.source))
                   from public.user_plans p join auth.users u on u.id = p.user_id), '[]'::jsonb);
end $$;
revoke all on function public.admin_plans() from public, anon;
grant execute on function public.admin_plans() to authenticated;

create or replace function public.admin_set_plan(p_email text, p_plan text, p_days int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not exists (select 1 from public.admins where user_id = auth.uid()) then raise exception 'not_admin' using errcode = '42501'; end if;
  if p_plan not in ('free','pro') then raise exception 'invalid_plan'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then raise exception 'user_not_found'; end if;
  insert into public.user_plans(user_id, plan, pro_until, trial_used, source, updated_at)
    values (uid, p_plan, case when p_plan = 'pro' and p_days is not null then now() + make_interval(days => p_days) end, true, 'admin', now())
  on conflict (user_id) do update set plan = excluded.plan, pro_until = excluded.pro_until, source = 'admin', trial_used = true, updated_at = now();
  return jsonb_build_object('email', p_email, 'plan', p_plan);
end $$;
revoke all on function public.admin_set_plan(text, text, int) from public, anon;
grant execute on function public.admin_set_plan(text, text, int) to authenticated;
