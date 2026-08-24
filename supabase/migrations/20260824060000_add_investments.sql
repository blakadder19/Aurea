-- Inversiones reales -------------------------------------------------------
-- A diferencia de Deudas, aquí no hay saldo bancario sincronizado que
-- reutilizar: la valoración de un fondo/cripto no viene de Enable Banking.
-- Posiciones gestionadas a mano por el usuario (nombre, tipo, unidades,
-- coste medio, valor y aportado) — mismo patrón de seguridad de siempre.

create table public.investments (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  name              text not null,
  product_type      text not null default 'Otros',
  units             numeric,
  avg_cost_cents    bigint,
  value_cents       bigint not null default 0,
  contributed_cents bigint not null default 0,
  archived          boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (id, user_id),
  constraint investments_value_nonneg check (value_cents >= 0),
  constraint investments_contributed_nonneg check (contributed_cents >= 0),
  constraint investments_avg_cost_nonneg check (avg_cost_cents is null or avg_cost_cents >= 0),
  constraint investments_units_nonneg check (units is null or units >= 0)
);

create index idx_investments_user on public.investments (user_id);

alter table public.investments enable row level security;
alter table public.investments force row level security;

revoke all privileges on public.investments from public, anon, authenticated;
grant select, insert, update on public.investments to authenticated;

create policy own_investments on public.investments
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

do $$
declare
  granted_priv text;
  denied_priv text;
  granted_privs text[] := array['SELECT', 'INSERT', 'UPDATE'];
  denied_privs text[] := array['DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'];
begin
  foreach granted_priv in array granted_privs loop
    if not has_table_privilege('authenticated', 'public.investments', granted_priv) then
      raise exception 'privilegio faltante: authenticated debería tener % en public.investments', granted_priv;
    end if;
  end loop;
  foreach denied_priv in array denied_privs loop
    if has_table_privilege('authenticated', 'public.investments', denied_priv) then
      raise exception 'privilegio de más: authenticated NO debería tener % en public.investments', denied_priv;
    end if;
  end loop;
  foreach denied_priv in array (granted_privs || denied_privs) loop
    if has_table_privilege('anon', 'public.investments', denied_priv) then
      raise exception 'privilegio de más: anon NO debería tener % en public.investments', denied_priv;
    end if;
  end loop;
end $$;
