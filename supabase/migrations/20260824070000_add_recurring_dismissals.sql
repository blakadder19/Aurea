-- Pagos y suscripciones reales -----------------------------------------
-- No hay tabla de "recurrentes": se detectan en el cliente a partir de
-- `transactions` (mismo espíritu que Presupuesto, que calcula el gasto en
-- vivo). Lo único que necesita persistencia es qué avisos o elementos ha
-- descartado el usuario ("Aceptar el cambio", "No es duplicado", "Pausar",
-- "Cancelar"), para que no reaparezcan en cada sesión. `active=false`
-- permite deshacer sin DELETE, mismo patrón de siempre.

create table public.recurring_dismissals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  dedupe_key text not null,
  scope      text not null check (scope in ('highlight', 'item')),
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, dedupe_key, scope)
);

create index idx_recurring_dismissals_user on public.recurring_dismissals (user_id);

alter table public.recurring_dismissals enable row level security;
alter table public.recurring_dismissals force row level security;

revoke all privileges on public.recurring_dismissals from public, anon, authenticated;
grant select, insert, update on public.recurring_dismissals to authenticated;

create policy own_recurring_dismissals on public.recurring_dismissals
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

do $$
declare
  granted_priv text;
  denied_priv text;
  granted_privs text[] := array['SELECT', 'INSERT', 'UPDATE'];
  denied_privs text[] := array['DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'];
begin
  foreach granted_priv in array granted_privs loop
    if not has_table_privilege('authenticated', 'public.recurring_dismissals', granted_priv) then
      raise exception 'privilegio faltante: authenticated debería tener % en public.recurring_dismissals', granted_priv;
    end if;
  end loop;
  foreach denied_priv in array denied_privs loop
    if has_table_privilege('authenticated', 'public.recurring_dismissals', denied_priv) then
      raise exception 'privilegio de más: authenticated NO debería tener % en public.recurring_dismissals', denied_priv;
    end if;
  end loop;
  foreach denied_priv in array (granted_privs || denied_privs) loop
    if has_table_privilege('anon', 'public.recurring_dismissals', denied_priv) then
      raise exception 'privilegio de más: anon NO debería tener % en public.recurring_dismissals', denied_priv;
    end if;
  end loop;
end $$;
