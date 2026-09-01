-- Presupuesto real ------------------------------------------------------------
-- Una fila por (usuario, categoría, mes): el límite que el usuario se puso.
-- El gasto real no se guarda aquí — se calcula en vivo sumando transactions
-- (igual que en Aurea Finanzas: sin tabla de agregados, sin motor server-side).
-- Mismo patrón de seguridad que el resto: revoke-all + grant mínimo, RLS
-- "own_budgets", FK compuesta (id, user_id), sin DELETE.

create table public.budgets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  category_id  uuid not null,
  month        date not null,
  amount_cents bigint not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, category_id, month),
  constraint budgets_month_first_day check (month = date_trunc('month', month)::date),
  constraint budgets_amount_nonneg check (amount_cents >= 0),
  constraint budgets_category_same_user
    foreign key (category_id, user_id)
    references public.categories (id, user_id) on delete cascade
);

create index idx_budgets_user_month on public.budgets (user_id, month);

alter table public.budgets enable row level security;
alter table public.budgets force row level security;

revoke all privileges on public.budgets from public, anon, authenticated;
grant select, insert, update on public.budgets to authenticated;

create policy own_budgets on public.budgets
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

do $$
declare
  granted_priv text;
  denied_priv text;
  granted_privs text[] := array['SELECT', 'INSERT', 'UPDATE'];
  denied_privs text[] := array['DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'];
begin
  foreach granted_priv in array granted_privs loop
    if not has_table_privilege('authenticated', 'public.budgets', granted_priv) then
      raise exception 'privilegio faltante: authenticated debería tener % en public.budgets', granted_priv;
    end if;
  end loop;
  foreach denied_priv in array denied_privs loop
    if has_table_privilege('authenticated', 'public.budgets', denied_priv) then
      raise exception 'privilegio de más: authenticated NO debería tener % en public.budgets', denied_priv;
    end if;
  end loop;
  foreach denied_priv in array (granted_privs || denied_privs) loop
    if has_table_privilege('anon', 'public.budgets', denied_priv) then
      raise exception 'privilegio de más: anon NO debería tener % en public.budgets', denied_priv;
    end if;
  end loop;
end $$;
