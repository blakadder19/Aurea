-- Etiquetar en lote en una sola sentencia ---------------------------------------
--
-- `bulkAddTag` leía los movimientos seleccionados y luego mandaba UN UPDATE POR
-- MOVIMIENTO, en paralelo con `Promise.all`. Tres seleccionados, cuatro viajes
-- de ida y vuelta. Eso tiene dos problemas que no se arreglan mirando el código
-- del cliente:
--
--   * Es parcialmente fallable. Si una de las N escrituras no llega, las otras
--     sí, y el usuario se queda con la etiqueta a medio poner sin saber cuáles.
--   * No es comprobable después. El cliente solo miraba si ALGUNA devolvía
--     error; nadie contaba cuántas filas habían cambiado de verdad, así que un
--     lote a medias era indistinguible de uno completo.
--
-- Una sola sentencia lo vuelve atómico: o se etiquetan todos o no se etiqueta
-- ninguno. Y devuelve cuántos llevan la etiqueta al terminar, que es la cifra
-- que el usuario puede contrastar con lo que seleccionó.
--
-- `security invoker`: corre con el RLS de quien llama, igual que
-- `replace_transaction_splits`. No puede tocar movimientos ajenos.
create or replace function public.add_tag_to_transactions(p_ids uuid[], p_tag text)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_tag text := btrim(p_tag);
  v_count integer;
begin
  if v_tag = '' then
    raise exception 'La etiqueta no puede estar vacía.';
  end if;

  -- `tags` es `not null default '{}'`, así que array_append nunca recibe null.
  -- Se excluyen los que ya la llevaban para no duplicarla.
  update public.transactions
     set tags = array_append(tags, v_tag)
   where id = any(p_ids)
     and not (v_tag = any(tags));

  -- Cuántos la llevan AHORA, no cuántas filas se han tocado: a quien etiqueta
  -- le importa el resultado, y uno que ya la tuviera cuenta igual.
  select count(*) into v_count
    from public.transactions
   where id = any(p_ids)
     and v_tag = any(tags);

  return v_count;
end;
$$;

grant execute on function public.add_tag_to_transactions(uuid[], text) to authenticated;
