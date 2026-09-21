-- Poner y quitar etiquetas en lote, cada una en una sola sentencia --------------
--
-- Misma razón que en `add_tag_to_transactions` sobre el text[]: N escrituras
-- independientes pueden quedarse a medias y nadie se entera. Aquí es atómico y
-- devuelve cuántos movimientos quedan como se pedía, para poder contrastarlo
-- con cuántos se seleccionaron.
--
-- `security invoker`: corren con el RLS de quien llama.

-- La versión vieja trabajaba sobre el text[], que ya no existe.
drop function if exists public.add_tag_to_transactions(uuid[], text);

create or replace function public.add_tag_to_transactions(p_ids uuid[], p_tag_id uuid)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.transaction_tags (transaction_id, tag_id, user_id)
  select t.id, p_tag_id, t.user_id
    from public.transactions t
   where t.id = any(p_ids)
  on conflict (transaction_id, tag_id) do nothing;

  -- Cuántos la llevan AHORA, no cuántas filas se han insertado: uno que ya la
  -- tuviera cuenta igual para quien está etiquetando.
  select count(*) into v_count
    from public.transaction_tags
   where transaction_id = any(p_ids) and tag_id = p_tag_id;

  return v_count;
end;
$$;

create or replace function public.remove_tag_from_transactions(p_ids uuid[], p_tag_id uuid)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count integer;
begin
  delete from public.transaction_tags
   where transaction_id = any(p_ids) and tag_id = p_tag_id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

/**
 * Las etiquetas de UN movimiento, tal y como quedan tras editarlas en el panel.
 * Reemplaza el conjunto entero en una transacción: no hay un instante en el que
 * el movimiento se quede sin las que ya tenía.
 */
create or replace function public.set_transaction_tags(p_transaction_id uuid, p_tag_ids uuid[])
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid;
  v_count   integer;
begin
  select user_id into v_user_id from public.transactions where id = p_transaction_id;
  if v_user_id is null then
    raise exception 'Movimiento no encontrado.';
  end if;

  delete from public.transaction_tags
   where transaction_id = p_transaction_id
     and not (tag_id = any(coalesce(p_tag_ids, '{}'::uuid[])));

  insert into public.transaction_tags (transaction_id, tag_id, user_id)
  select p_transaction_id, unnest(coalesce(p_tag_ids, '{}'::uuid[])), v_user_id
  on conflict (transaction_id, tag_id) do nothing;

  select count(*) into v_count from public.transaction_tags where transaction_id = p_transaction_id;
  return v_count;
end;
$$;

grant execute on function public.add_tag_to_transactions(uuid[], uuid)      to authenticated;
grant execute on function public.remove_tag_from_transactions(uuid[], uuid) to authenticated;
grant execute on function public.set_transaction_tags(uuid, uuid[])         to authenticated;
