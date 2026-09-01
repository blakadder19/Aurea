create view public.transaction_category_amounts
with (security_invoker = on) as
select
  t.id as transaction_id,
  t.user_id,
  t.account_id,
  t.booking_date,
  t.value_date,
  t.is_internal_transfer,
  s.category_id,
  s.amount_cents
from public.transactions t
join public.transaction_splits s on s.transaction_id = t.id
union all
select
  t.id as transaction_id,
  t.user_id,
  t.account_id,
  t.booking_date,
  t.value_date,
  t.is_internal_transfer,
  t.category_id,
  t.amount_cents
from public.transactions t
where not exists (select 1 from public.transaction_splits s where s.transaction_id = t.id);

grant select on public.transaction_category_amounts to authenticated;
