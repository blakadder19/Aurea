-- declared_incomes ya existía en remoto (creada fuera de una migración
-- local en algún punto anterior de este proyecto) — este archivo solo
-- deja constancia local del esquema real, de forma idempotente: no
-- cambia nada si ya existe tal cual.
create table if not exists public.declared_incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount_cents bigint not null check (amount_cents > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index if not exists idx_declared_incomes_user on public.declared_incomes (user_id);

alter table public.declared_incomes enable row level security;
alter table public.declared_incomes force row level security;

revoke all privileges on public.declared_incomes from public, anon, authenticated;
grant select, insert, update on public.declared_incomes to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'declared_incomes' and policyname = 'own_declared_incomes_select') then
    create policy own_declared_incomes_select on public.declared_incomes for select to authenticated using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'declared_incomes' and policyname = 'own_declared_incomes_insert') then
    create policy own_declared_incomes_insert on public.declared_incomes for insert to authenticated with check (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'declared_incomes' and policyname = 'own_declared_incomes_update') then
    create policy own_declared_incomes_update on public.declared_incomes for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;
