create table public.transaction_splits (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  category_id uuid not null references public.categories(id),
  amount_cents integer not null,
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

revoke all on public.transaction_splits from public, anon, authenticated;
grant select, insert, delete on public.transaction_splits to authenticated;

alter table public.transaction_splits enable row level security;

create policy own_transaction_splits_select on public.transaction_splits
  for select to authenticated using (user_id = (select auth.uid()));
create policy own_transaction_splits_insert on public.transaction_splits
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy own_transaction_splits_delete on public.transaction_splits
  for delete to authenticated using (user_id = (select auth.uid()));

create index idx_transaction_splits_transaction on public.transaction_splits (transaction_id);
create index idx_transaction_splits_user on public.transaction_splits (user_id);

create or replace function public.check_transaction_splits_sum()
returns trigger
language plpgsql
as $$
declare
  v_tx_id uuid;
  v_tx_amount integer;
  v_splits_sum integer;
begin
  v_tx_id := coalesce(new.transaction_id, old.transaction_id);
  select amount_cents into v_tx_amount from public.transactions where id = v_tx_id;
  select coalesce(sum(amount_cents), 0) into v_splits_sum from public.transaction_splits where transaction_id = v_tx_id;
  if v_splits_sum <> 0 and v_splits_sum <> v_tx_amount then
    raise exception 'La suma de los splits (%) no coincide con el importe del movimiento (%)', v_splits_sum, v_tx_amount;
  end if;
  return null;
end;
$$;

create constraint trigger transaction_splits_sum_check
  after insert or update or delete on public.transaction_splits
  deferrable initially deferred
  for each row execute function public.check_transaction_splits_sum();
