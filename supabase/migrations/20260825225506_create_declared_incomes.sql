create table public.declared_incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount_cents bigint not null check (amount_cents > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

revoke all on public.declared_incomes from public, anon, authenticated;
grant select, insert, update on public.declared_incomes to authenticated;

alter table public.declared_incomes enable row level security;

create policy own_declared_incomes_select on public.declared_incomes for select to authenticated using (user_id = (select auth.uid()));
create policy own_declared_incomes_insert on public.declared_incomes for insert to authenticated with check (user_id = (select auth.uid()));
create policy own_declared_incomes_update on public.declared_incomes for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create index idx_declared_incomes_user on public.declared_incomes (user_id);
