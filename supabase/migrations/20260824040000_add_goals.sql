-- Objetivos reales --------------------------------------------------------
-- No existe un esquema de objetivos en Aurea Finanzas que portar (nunca se
-- construyó ahí tampoco) — tabla nueva, diseñada desde cero pero con el
-- mismo patrón de seguridad que el resto: revoke-all + grant mínimo, RLS
-- "own_goals", sin DELETE (se archivan, no se borran).

create table public.goals (
  id                         uuid primary key default gen_random_uuid(),
  user_id                    uuid not null references auth.users (id) on delete cascade,
  name                       text not null,
  target_cents               bigint not null,
  saved_cents                bigint not null default 0,
  monthly_contribution_cents bigint not null default 0,
  archived                   boolean not null default false,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  unique (id, user_id),
  constraint goals_target_positive check (target_cents > 0),
  constraint goals_saved_nonneg check (saved_cents >= 0),
  constraint goals_contribution_nonneg check (monthly_contribution_cents >= 0)
);

create index idx_goals_user on public.goals (user_id);

alter table public.goals enable row level security;
alter table public.goals force row level security;

revoke all privileges on public.goals from public, anon, authenticated;
grant select, insert, update on public.goals to authenticated;

create policy own_goals on public.goals
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

do $$
declare
  granted_priv text;
  denied_priv text;
  granted_privs text[] := array['SELECT', 'INSERT', 'UPDATE'];
  denied_privs text[] := array['DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'];
begin
  foreach granted_priv in array granted_privs loop
    if not has_table_privilege('authenticated', 'public.goals', granted_priv) then
      raise exception 'privilegio faltante: authenticated debería tener % en public.goals', granted_priv;
    end if;
  end loop;
  foreach denied_priv in array denied_privs loop
    if has_table_privilege('authenticated', 'public.goals', denied_priv) then
      raise exception 'privilegio de más: authenticated NO debería tener % en public.goals', denied_priv;
    end if;
  end loop;
  foreach denied_priv in array (granted_privs || denied_privs) loop
    if has_table_privilege('anon', 'public.goals', denied_priv) then
      raise exception 'privilegio de más: anon NO debería tener % en public.goals', denied_priv;
    end if;
  end loop;
end $$;
