-- Campos del banco que hasta ahora se tiraban en la sync -----------------------
--
-- El mapeo de `persistence.ts` copiaba 9 campos de cada movimiento de Enable
-- Banking y descartaba el resto en silencio. Medido sobre 82 movimientos reales
-- del 17 sep 2026, la respuesta trae 24 campos, y dos de los descartados son
-- información que el banco ya nos daba y que no se puede reconstruir después:
--
--   * `bank_transaction_code.code` — viene en el 100% de los movimientos y
--     distingue CARD_PAYMENT / EXCHANGE / CARD_REFUND. Hoy se adivina
--     comparando importes; el banco ya lo dice.
--   * `exchange_rate` — viene en 46 de 82. Trae la tasa exacta del momento del
--     pago y el importe instruido (el euro ANTES del margen de Revolut). La
--     diferencia con `amount_cents` es la comisión de cambio.
--
-- Ojo con la semántica, medida y no documentada por Enable Banking:
--   * `exchange_rate` en un CARD_PAYMENT se cotiza con `unit_currency = 'EUR'`
--     y NO nombra la divisa extranjera por ningún lado. Solo un CARD_REFUND la
--     nombra, y con la tasa invertida. Por eso se guarda `unit_currency` tal
--     cual en vez de intentar deducir un par de divisas que el dato no da.
--   * un pago desde un pocket en esa misma divisa llega con `exchange_rate`
--     nulo: no hubo cambio en ese instante. El euro de esos movimientos no
--     está en la API y no se resuelve aquí.

alter table public.transactions
  -- CARD_PAYMENT / EXCHANGE / CARD_REFUND / … tal y como lo manda el banco.
  add column if not exists transaction_code            text,
  -- `numeric` y no `double precision`: la tasa llega con 17 cifras
  -- significativas ("7.7270629130483708") y un float64 ya no las guarda
  -- exactas. Se inserta desde el string original, sin pasar por coma flotante.
  add column if not exists exchange_rate               numeric,
  -- Divisa en la que se cotiza la tasa (`unit_currency`), sin interpretar.
  add column if not exists exchange_rate_unit_currency text,
  -- Importe instruido, en céntimos y con el mismo signo que `amount_cents`
  -- (negativo si DBIT), para que ambos se puedan comparar sin más.
  add column if not exists instructed_amount_cents     bigint,
  add column if not exists instructed_currency         text;

comment on column public.transactions.transaction_code is
  'bank_transaction_code.code de Enable Banking, sin interpretar.';
comment on column public.transactions.exchange_rate is
  'Tasa exacta del momento del pago. Nula si no hubo cambio de divisa.';
comment on column public.transactions.instructed_amount_cents is
  'Importe instruido en céntimos, mismo signo que amount_cents. El euro antes del margen de Revolut; la diferencia con amount_cents es la comisión de cambio.';

-- Relleno de movimientos ya guardados ------------------------------------------
--
-- La inserción de la sync es `ignoreDuplicates: true`, así que un re-sync no
-- toca las filas que ya existen — por diseño: no debe pisar la categoría, la
-- nota ni la revisión que el usuario haya puesto a mano. Pero eso también deja
-- las columnas nuevas a null para siempre en los 427 movimientos ya
-- sincronizados.
--
-- Esta función es la excepción acotada: actualiza EXCLUSIVAMENTE las cinco
-- columnas de arriba, que salen enteras del banco y que el usuario no edita
-- nunca. No puede tocar `category_id`, `needs_review`, `user_note`, `tags` ni
-- ninguna otra, porque no aparecen en el UPDATE.
--
-- `security invoker`: corre con el RLS del usuario que llama, igual que
-- `replace_transaction_splits`. Nadie puede rellenar filas ajenas.
create or replace function public.backfill_transaction_bank_fields(p_rows jsonb)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_updated integer;
begin
  with incoming as (
    select
      (elem->>'account_id')::uuid                            as account_id,
      elem->>'dedup_key'                                     as dedup_key,
      nullif(elem->>'transaction_code', '')                  as transaction_code,
      (nullif(elem->>'exchange_rate', ''))::numeric          as exchange_rate,
      nullif(elem->>'exchange_rate_unit_currency', '')       as exchange_rate_unit_currency,
      (nullif(elem->>'instructed_amount_cents', ''))::bigint as instructed_amount_cents,
      nullif(elem->>'instructed_currency', '')               as instructed_currency
    from jsonb_array_elements(p_rows) as elem
  )
  update public.transactions t
     set transaction_code            = i.transaction_code,
         exchange_rate               = i.exchange_rate,
         exchange_rate_unit_currency = i.exchange_rate_unit_currency,
         instructed_amount_cents     = i.instructed_amount_cents,
         instructed_currency         = i.instructed_currency
    from incoming i
   where t.account_id = i.account_id
     and t.dedup_key  = i.dedup_key
     -- Solo las filas que realmente cambian: así el contador que devuelve
     -- dice algo (cuántas se rellenaron) y un re-sync estable no escribe nada.
     and (t.transaction_code            is distinct from i.transaction_code
       or t.exchange_rate               is distinct from i.exchange_rate
       or t.exchange_rate_unit_currency is distinct from i.exchange_rate_unit_currency
       or t.instructed_amount_cents     is distinct from i.instructed_amount_cents
       or t.instructed_currency         is distinct from i.instructed_currency);

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

grant execute on function public.backfill_transaction_bank_fields(jsonb) to authenticated;
