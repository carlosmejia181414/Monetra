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
