-- Ajustes básicos reales -------------------------------------------------
-- Moneda, formato de fecha e inicio del mes presupuestario: hoy son
-- selectores puramente locales (useSettingsStore), tanto en demo como en
-- real, y no cambian el comportamiento de ninguna pantalla todavía. Esta
-- tabla les da persistencia real por usuario; una fila por usuario
-- (user_id como PK), sin necesidad del patrón (id, user_id) porque no hay
-- ninguna FK que apunte aquí.

create table public.user_settings (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  currency           text not null default 'EUR (€)',
  date_format        text not null default 'DD/MM/AAAA',
  budget_month_start integer not null default 1,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint user_settings_currency_check check (currency in ('EUR (€)', 'USD ($)', 'GBP (£)')),
  constraint user_settings_date_format_check check (date_format in ('DD/MM/AAAA', 'MM/DD/AAAA', 'AAAA-MM-DD')),
  constraint user_settings_budget_month_start_check check (budget_month_start in (1, 5, 15, 25))
);

alter table public.user_settings enable row level security;
alter table public.user_settings force row level security;

revoke all privileges on public.user_settings from public, anon, authenticated;
grant select, insert, update on public.user_settings to authenticated;

create policy own_user_settings on public.user_settings
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

do $$
declare
  granted_priv text;
  denied_priv text;
  granted_privs text[] := array['SELECT', 'INSERT', 'UPDATE'];
  denied_privs text[] := array['DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'];
begin
  foreach granted_priv in array granted_privs loop
    if not has_table_privilege('authenticated', 'public.user_settings', granted_priv) then
      raise exception 'privilegio faltante: authenticated debería tener % en public.user_settings', granted_priv;
    end if;
  end loop;
  foreach denied_priv in array denied_privs loop
    if has_table_privilege('authenticated', 'public.user_settings', denied_priv) then
      raise exception 'privilegio de más: authenticated NO debería tener % en public.user_settings', denied_priv;
    end if;
  end loop;
  foreach denied_priv in array (granted_privs || denied_privs) loop
    if has_table_privilege('anon', 'public.user_settings', denied_priv) then
      raise exception 'privilegio de más: anon NO debería tener % en public.user_settings', denied_priv;
    end if;
  end loop;
end $$;
