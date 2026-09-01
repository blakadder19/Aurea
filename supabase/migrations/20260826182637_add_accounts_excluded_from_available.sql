-- Permite excluir una cuenta "Para gastar" del cálculo de disponible hoy
-- sin cambiarle la función — caso real: una cuenta conjunta que cuenta
-- como "para gastar" pero que el usuario no usa para su gasto del día a día.
alter table public.accounts
  add column excluded_from_available boolean not null default false;
