-- Reembolsos --------------------------------------------------------------
-- Cuando alguien te devuelve su parte de un gasto compartido (la cena que
-- pagaste tú, el seguro que va a medias), ese abono NO es un ingreso tuyo:
-- es que el gasto real fue menor. Contarlo como ingreso infla a la vez tus
-- ingresos y tus gastos, y deja la tasa de ahorro sin sentido.
--
-- Un movimiento positivo con is_reimbursement = true y una categoría RESTA
-- del gasto de esa categoría, en vez de sumar como ingreso.
alter table public.transactions
  add column if not exists is_reimbursement boolean not null default false;

-- La vista gana la columna (al final: `create or replace view` no permite
-- insertarla en medio) para que Presupuesto e Informes puedan distinguirlo
-- sin volver a consultar `transactions`.
create or replace view public.transaction_category_amounts as
 SELECT t.id AS transaction_id,
    t.user_id,
    t.account_id,
    t.booking_date,
    t.value_date,
    t.is_internal_transfer,
    s.category_id,
    s.amount_cents,
    t.is_reimbursement
   FROM transactions t
     JOIN transaction_splits s ON s.transaction_id = t.id
UNION ALL
 SELECT t.id AS transaction_id,
    t.user_id,
    t.account_id,
    t.booking_date,
    t.value_date,
    t.is_internal_transfer,
    t.category_id,
    t.amount_cents,
    t.is_reimbursement
   FROM transactions t
  WHERE NOT (EXISTS ( SELECT 1
           FROM transaction_splits s
          WHERE s.transaction_id = t.id));

-- IMPRESCINDIBLE: `create or replace view` NO conserva security_invoker, y
-- sin él la vista aplicaría los permisos de quien la creó en vez de los de
-- quien consulta — es decir, se saltaría RLS. Cualquier futuro cambio de
-- esta vista tiene que volver a ponerlo.
alter view public.transaction_category_amounts set (security_invoker = on);
