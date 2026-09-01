create table public.manual_recurring_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  name text not null,
  amount_cents integer not null check (amount_cents > 0),
  frequency text not null default 'Mensual',
  next_charge_date date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

revoke all on public.manual_recurring_items from public, anon, authenticated;
grant select, insert, update on public.manual_recurring_items to authenticated;

alter table public.manual_recurring_items enable row level security;

create policy own_manual_recurring_items_select on public.manual_recurring_items
  for select to authenticated using (user_id = (select auth.uid()));
create policy own_manual_recurring_items_insert on public.manual_recurring_items
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy own_manual_recurring_items_update on public.manual_recurring_items
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create index idx_manual_recurring_items_user on public.manual_recurring_items (user_id);
