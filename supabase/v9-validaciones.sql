-- ============================================================
-- Monetra v9.1 - Validaciones en la base de datos (defensa en profundidad)
-- Supabase > SQL Editor > New query > pega todo > Run. No borra datos. Se puede ejecutar varias veces.
-- Evita que alguien salte la página y guarde datos inválidos (tipos raros, montos negativos, textos enormes).
-- Los datos que ya existen NO se tocan (NOT VALID): solo se revisan los datos nuevos.
-- ============================================================
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'transactions_type_chk') then
    alter table public.transactions add constraint transactions_type_chk check (type in ('income','fixed','variable','savings','fixed_override','fixed_deleted')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'transactions_amount_chk') then
    alter table public.transactions add constraint transactions_amount_chk check (amount >= 0) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'transactions_desc_chk') then
    alter table public.transactions add constraint transactions_desc_chk check (char_length(description) <= 300) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'categories_name_chk') then
    alter table public.categories add constraint categories_name_chk check (char_length(btrim(name)) between 1 and 60) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'page_events_event_fmt_chk') then
    alter table public.page_events add constraint page_events_event_fmt_chk check (event ~ '^[a-z0-9_]{1,40}$') not valid;
  end if;
end $$;
