-- ============================================================
-- Monetra v11 - GUÍA CON IA dentro del dashboard (límite diario por usuario)
-- Supabase > SQL Editor > New query > pega TODO > Run. Se puede ejecutar varias veces.
-- ============================================================
create table if not exists public.guide_usage (
  day   date not null default current_date,
  uid   uuid not null,
  count int  not null default 0,
  primary key (day, uid)
);
alter table public.guide_usage enable row level security;
-- Sin políticas: solo la función (service role) la usa.

create or replace function public.guide_consume(p_user uuid, p_limit int)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from public.guide_usage where day < current_date - 3;
  insert into public.guide_usage(day, uid, count) values (current_date, p_user, 1)
  on conflict (day, uid) do update set count = public.guide_usage.count + 1
  returning count into n;
  if n > p_limit then
    update public.guide_usage set count = p_limit where day = current_date and uid = p_user;
    return false;
  end if;
  return true;
end $$;
revoke all on function public.guide_consume(uuid, int) from public, anon, authenticated;
grant execute on function public.guide_consume(uuid, int) to service_role;
grant select, insert, update, delete on public.guide_usage to service_role;
