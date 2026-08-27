-- Ajustes de saldo -------------------------------------------------------
-- Un piso, un coche o una hucha en efectivo entran en tu patrimonio como
-- cuenta manual con un saldo inicial. Ese saldo NO es un ingreso: es
-- dinero (o valor) que ya tenías el día que lo diste de alta. Igual pasa
-- al revalorizar: si tu piso pasa de valer 240.000 a 250.000, no has
-- ingresado 10.000 €.
--
-- Sin esto, dar de alta un piso de 240.000 € metía 240.000 € de "ingresos"
-- en el mes, reventando la tasa de ahorro y las medias de Planificación.
alter table public.transactions
  add column if not exists is_balance_adjustment boolean not null default false;

create or replace view public.transaction_category_amounts as
 SELECT t.id AS transaction_id,
    t.user_id,
    t.account_id,
    t.booking_date,
    t.value_date,
    t.is_internal_transfer,
    s.category_id,
    s.amount_cents,
    t.is_reimbursement,
    t.is_balance_adjustment
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
    t.is_reimbursement,
    t.is_balance_adjustment
   FROM transactions t
  WHERE NOT (EXISTS ( SELECT 1
           FROM transaction_splits s
          WHERE s.transaction_id = t.id));

-- IMPRESCINDIBLE tras cada `create or replace view`: no conserva
-- security_invoker, y sin él la vista se saltaría RLS.
alter view public.transaction_category_amounts set (security_invoker = on);

-- Los saldos iniciales ya existentes tampoco eran ingresos.
update public.transactions set is_balance_adjustment = true where description = 'Saldo inicial';
