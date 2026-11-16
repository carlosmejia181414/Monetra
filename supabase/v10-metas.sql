-- ============================================================
-- Monetra v10 - METAS DE AHORRO (casa, carro, viaje, emergencia...)
-- Supabase > SQL Editor > New query > pega TODO > Run.
-- No borra datos. Se puede ejecutar varias veces.
-- Requiere haber ejecutado antes: setup.sql y hogar.sql (plan.sql es opcional: sin él no hay límites).
-- ============================================================

-- 1) Metas. Personales (household_id nulo) o compartidas con el hogar.
create table if not exists public.goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  household_id  uuid references public.households(id) on delete cascade,
  name          text not null,
  icon          text not null default 'target',
  target_amount numeric(14,2) not null,
  target_date   date,
  archived      boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists goals_user_idx      on public.goals (user_id) where household_id is null;
create index if not exists goals_household_idx on public.goals (household_id);

-- 2) Aportes (positivo = aporte, negativo = retiro)
create table if not exists public.goal_contributions (
  id         uuid primary key default gen_random_uuid(),
  goal_id    uuid not null references public.goals(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  amount     numeric(14,2) not null,
  note       text not null default '',
  date       date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists goal_contrib_goal_idx on public.goal_contributions (goal_id, date);

-- 3) Validaciones (idempotentes)
do $$ begin
  begin alter table public.goals add constraint goals_name_chk   check (char_length(btrim(name)) between 1 and 60); exception when duplicate_object then null; end;
  begin alter table public.goals add constraint goals_icon_chk   check (icon ~ '^[a-z_]{1,20}$'); exception when duplicate_object then null; end;
  begin alter table public.goals add constraint goals_target_chk check (target_amount > 0 and target_amount < 1000000000000); exception when duplicate_object then null; end;
  begin alter table public.goal_contributions add constraint goal_contrib_amount_chk check (amount <> 0); exception when duplicate_object then null; end;
  begin alter table public.goal_contributions add constraint goal_contrib_note_chk   check (char_length(note) <= 200); exception when duplicate_object then null; end;
end $$;

-- 4) ¿El usuario actual puede ver/usar esta meta?
create or replace function public.can_access_goal(g uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.goals x
    where x.id = g
      and ((x.household_id is null and x.user_id = auth.uid())
        or (x.household_id is not null and public.is_household_member(x.household_id)))
  );
$$;
revoke all on function public.can_access_goal(uuid) from public, anon;
grant execute on function public.can_access_goal(uuid) to authenticated;

-- 5) Seguridad por fila (RLS)
alter table public.goals              enable row level security;
alter table public.goal_contributions enable row level security;

drop policy if exists "scoped_goals" on public.goals;
create policy "scoped_goals" on public.goals for all to authenticated
  using ((household_id is null and user_id = (select auth.uid())) or (household_id is not null and public.is_household_member(household_id)))
  with check ((household_id is null and user_id = (select auth.uid())) or (household_id is not null and public.is_household_member(household_id)));

drop policy if exists "goal_contrib_read"   on public.goal_contributions;
drop policy if exists "goal_contrib_insert" on public.goal_contributions;
drop policy if exists "goal_contrib_update" on public.goal_contributions;
drop policy if exists "goal_contrib_delete" on public.goal_contributions;
create policy "goal_contrib_read"   on public.goal_contributions for select to authenticated using (public.can_access_goal(goal_id));
create policy "goal_contrib_insert" on public.goal_contributions for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_access_goal(goal_id));
create policy "goal_contrib_update" on public.goal_contributions for update to authenticated
  using (user_id = (select auth.uid()) and public.can_access_goal(goal_id))
  with check (user_id = (select auth.uid()) and public.can_access_goal(goal_id));
create policy "goal_contrib_delete" on public.goal_contributions for delete to authenticated
  using (user_id = (select auth.uid()) and public.can_access_goal(goal_id));

-- 6) Límite del plan Gratis: 2 metas personales activas (Pro: sin límite).
--    Si plan.sql no está instalado, no hay límite.
create or replace function public.enforce_goal_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null or new.household_id is not null or new.archived then return new; end if;
  begin
    if public.plan_of(auth.uid()) <> 'pro' then
      select count(*) into n from public.goals
        where user_id = auth.uid() and household_id is null and not archived and id <> new.id;
      if n >= 2 then raise exception 'limit_goals'; end if;
    end if;
  exception when undefined_function then
    return new;
  end;
  return new;
end $$;
drop trigger if exists goals_limit on public.goals;
create trigger goals_limit before insert or update of archived on public.goals
  for each row execute function public.enforce_goal_limit();
