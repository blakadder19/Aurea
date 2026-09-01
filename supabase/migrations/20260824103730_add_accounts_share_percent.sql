-- Porcentaje de titularidad por cuenta ------------------------------------
-- Para cuentas compartidas (p. ej. una cuenta conjunta de pareja): cuánto
-- de su saldo cuenta como patrimonio propio del usuario. 100 = se cuenta
-- entero (comportamiento por defecto, igual que hasta ahora). El GRANT
-- table-level ya existente sobre public.accounts cubre esta columna nueva
-- sin necesidad de un GRANT adicional.
alter table public.accounts
  add column share_percent smallint not null default 100
    constraint accounts_share_percent_range check (share_percent between 0 and 100);
