create or replace function public.check_transaction_splits_sum()
returns trigger
language plpgsql
set search_path = public
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
