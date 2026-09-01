-- Tipo de ingreso, para el desglose del nuevo módulo Ingresos.
alter table public.declared_incomes
  add column income_type text check (income_type in ('salario', 'extra', 'autonomo', 'inversion', 'alquiler', 'otro'));

-- Solo tiene sentido en movimientos positivos, pero se deja como check
-- suave (no obligatorio) para no romper movimientos ya existentes.
alter table public.transactions
  add column income_type text check (income_type in ('salario', 'extra', 'autonomo', 'inversion', 'alquiler', 'otro'));

-- Dinero que le deben al usuario — igual de forma que goals pero para
-- una deuda ajena, no propia (deudas propias ya viven en debt_details).
create table public.receivables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount_cents bigint not null,
  settled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  constraint receivables_amount_positive check (amount_cents > 0)
);

create index idx_receivables_user on public.receivables (user_id);

alter table public.receivables enable row level security;
alter table public.receivables force row level security;

revoke all privileges on public.receivables from public, anon, authenticated;
grant select, insert, update on public.receivables to authenticated;

create policy own_receivables on public.receivables
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

do $$
declare
  granted_priv text;
  denied_priv text;
  granted_privs text[] := array['SELECT', 'INSERT', 'UPDATE'];
  denied_privs text[] := array['DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'];
begin
  foreach granted_priv in array granted_privs loop
    if not has_table_privilege('authenticated', 'public.receivables', granted_priv) then
      raise exception 'privilegio faltante: authenticated debería tener % en public.receivables', granted_priv;
    end if;
  end loop;
  foreach denied_priv in array denied_privs loop
    if has_table_privilege('authenticated', 'public.receivables', denied_priv) then
      raise exception 'privilegio de más: authenticated NO debería tener % en public.receivables', denied_priv;
    end if;
  end loop;
  foreach denied_priv in array (granted_privs || denied_privs) loop
    if has_table_privilege('anon', 'public.receivables', denied_priv) then
      raise exception 'privilegio de más: anon NO debería tener % en public.receivables', denied_priv;
    end if;
  end loop;
end $$;
