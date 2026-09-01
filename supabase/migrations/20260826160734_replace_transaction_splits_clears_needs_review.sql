-- Dividir un movimiento (transaction_splits) nunca tocaba needs_review del
-- movimiento padre: Presupuesto e Informes ya leen bien el gasto dividido
-- (vista transaction_category_amounts), pero Centro de revisión, el
-- contador del menú y "Clasificar todos los pendientes con IA" siguen
-- mirando needs_review/category_id directo de transactions, así que un
-- movimiento dividido se quedaba "pendiente" para siempre.
create or replace function public.replace_transaction_splits(p_transaction_id uuid, p_splits jsonb)
returns void
language plpgsql
set search_path to 'public'
as $function$
declare
  v_tx_amount integer;
  v_sum integer;
  v_count integer;
begin
  select amount_cents into v_tx_amount from public.transactions where id = p_transaction_id;
  if v_tx_amount is null then
    raise exception 'Movimiento no encontrado.';
  end if;

  delete from public.transaction_splits where transaction_id = p_transaction_id;

  insert into public.transaction_splits (transaction_id, user_id, category_id, amount_cents)
  select p_transaction_id, (select user_id from public.transactions where id = p_transaction_id),
         (elem->>'category_id')::uuid, (elem->>'amount_cents')::integer
  from jsonb_array_elements(p_splits) as elem;

  select count(*), coalesce(sum(amount_cents), 0) into v_count, v_sum
  from public.transaction_splits where transaction_id = p_transaction_id;

  if v_count > 0 and v_sum <> v_tx_amount then
    raise exception 'La suma de las categorías (%) no coincide con el importe del movimiento (%).', v_sum, v_tx_amount;
  end if;

  if v_count > 0 then
    update public.transactions set needs_review = false where id = p_transaction_id;
  end if;
end;
$function$;
