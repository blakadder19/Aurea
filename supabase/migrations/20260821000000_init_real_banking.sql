-- Áurea · Fase 1 — persistencia de datos reales de banca (Enable Banking, AIS
-- de solo lectura) + estado OAuth para el flujo de conexión.
--
-- Patrón de seguridad (replicado de blakadder19/Aurea---Finanzas, ya auditado):
--   * Toda entidad pertenece a auth.users vía user_id, con RLS OBLIGATORIA.
--   * Las policies aplican SOLO al rol `authenticated` (nunca `anon`), con
--     USING y WITH CHECK, de modo que cada usuario solo accede a sus datos.
--   * Se revoca TODO privilegio preexistente de `public`/`anon`/`authenticated`
--     antes de conceder — un GRANT parcial no revoca privilegios por defecto
--     ya concedidos por Supabase, así que hay que partir de cero.
--   * Se concede únicamente select/insert/update al rol `authenticated`.
--     Nunca DELETE: los borrados se modelan como cambios de estado.
--   * Claves foráneas COMPUESTAS (id, user_id) impiden relacionar filas entre
--     usuarios distintos (una cuenta no puede colgar de la conexión de otro).
--   * Nunca se almacenan IBAN completos (solo versión enmascarada), ni claves,
--     JWT, identificadores de sesión bancarios en claro, ni payloads brutos.
--   * Importes en céntimos como enteros (bigint), nunca coma flotante.
--   * Timestamps en UTC (timestamptz).

create extension if not exists "pgcrypto";

-- Conexiones bancarias -------------------------------------------------------
-- eb_session_id / eb_account_uids: en Finanzas vivían en un fichero local del
-- backend Node; aquí no hay disco persistente (Edge Functions), así que la
-- sesión de Enable Banking se guarda en la propia fila de conexión.
create table if not exists public.bank_connections (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  provider          text not null default 'enable_banking',
  aspsp_name        text not null,
  aspsp_country     text not null,
  status            text not null default 'connected',
  eb_session_id     text,
  eb_account_uids   text[] not null default '{}',
  connected_at      timestamptz not null default now(),
  last_synced_at    timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, provider, aspsp_name, aspsp_country),
  unique (id, user_id)
);

-- Cuentas ---------------------------------------------------------------------
-- Identidad estable por (user_id, external_account_id, currency): una misma
-- cuenta puede tener varias divisas (p. ej. subcuentas Revolut con el mismo
-- IBAN) — cada divisa es una fila propia, no un campo "foreign" ad-hoc.
create table if not exists public.accounts (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users (id) on delete cascade,
  connection_id          uuid not null,
  external_account_id    text not null,
  currency               text not null,
  name                   text,
  product                text,
  iban_masked            text,
  principal_balance_type text,
  account_function       text not null default 'por_confirmar',
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (user_id, external_account_id, currency),
  unique (id, user_id),
  constraint accounts_connection_same_user
    foreign key (connection_id, user_id)
    references public.bank_connections (id, user_id) on delete cascade,
  constraint iban_must_be_masked check (
    iban_masked is null or iban_masked !~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$'
  ),
  constraint accounts_account_function_check check (account_function in (
    'gastar', 'ahorro', 'inversion', 'pagos', 'deuda', 'activo_manual',
    'excluida', 'por_confirmar'
  ))
);

-- Saldos ------------------------------------------------------------------------
create table if not exists public.balances (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  account_id     uuid not null,
  balance_type   text not null,
  amount_cents   bigint not null,
  currency       text not null,
  reference_date date,
  captured_at    timestamptz not null default now(),
  unique (account_id, balance_type),
  constraint balances_account_same_user
    foreign key (account_id, user_id)
    references public.accounts (id, user_id) on delete cascade
);

-- Movimientos ---------------------------------------------------------------
-- Idempotencia por (user_id, account_id, dedup_key): identificador externo
-- estable si existe, o huella determinista si falta.
create table if not exists public.transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  account_id   uuid not null,
  external_id  text,
  dedup_key    text not null,
  amount_cents bigint not null,
  currency     text not null,
  credit_debit text check (credit_debit in ('CRDT', 'DBIT')),
  status       text,
  booking_date date,
  value_date   date,
  description  text,
  created_at   timestamptz not null default now(),
  unique (user_id, account_id, dedup_key),
  constraint transactions_account_same_user
    foreign key (account_id, user_id)
    references public.accounts (id, user_id) on delete cascade
);

-- Ejecuciones de sincronización ----------------------------------------------
create table if not exists public.sync_runs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  connection_id    uuid,
  started_at       timestamptz not null default now(),
  finished_at      timestamptz,
  status           text not null default 'ok',
  accounts_count   integer not null default 0,
  transactions_new integer not null default 0,
  window_from      date,
  error_code       text,
  created_at       timestamptz not null default now(),
  constraint sync_runs_connection_same_user
    foreign key (connection_id, user_id)
    references public.bank_connections (id, user_id) on delete cascade
);

-- Estado OAuth (CSRF) para el flujo de Enable Banking -------------------------
-- Sustituye el Map en memoria del backend local de Finanzas: una Edge Function
-- no conserva estado entre invocaciones. Sin RLS de usuario final — solo la
-- propia Edge Function (con la clave de servicio) la lee/escribe, porque en el
-- paso `callback` puede no haber sesión de navegador activa todavía.
create table if not exists public.oauth_states (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  value       text not null unique,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  consumed_at timestamptz
);

-- Índices auxiliares ----------------------------------------------------------
create index if not exists idx_accounts_user on public.accounts (user_id);
create index if not exists idx_accounts_connection on public.accounts (connection_id);
create index if not exists idx_balances_account on public.balances (account_id);
create index if not exists idx_transactions_account on public.transactions (account_id);
create index if not exists idx_transactions_user on public.transactions (user_id);
create index if not exists idx_transactions_user_booking
  on public.transactions (user_id, booking_date desc, created_at desc, id desc);
create index if not exists idx_sync_runs_user on public.sync_runs (user_id);
create index if not exists idx_oauth_states_expires on public.oauth_states (expires_at);

-- updated_at automático ---------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_bank_connections_updated on public.bank_connections;
create trigger trg_bank_connections_updated before update on public.bank_connections
  for each row execute function public.set_updated_at();

drop trigger if exists trg_accounts_updated on public.accounts;
create trigger trg_accounts_updated before update on public.accounts
  for each row execute function public.set_updated_at();

-- RLS OBLIGATORIA en todas las tablas -----------------------------------------
alter table public.bank_connections enable row level security;
alter table public.accounts         enable row level security;
alter table public.balances         enable row level security;
alter table public.transactions     enable row level security;
alter table public.sync_runs        enable row level security;
alter table public.oauth_states     enable row level security;
alter table public.bank_connections force row level security;
alter table public.accounts         force row level security;
alter table public.balances         force row level security;
alter table public.transactions     force row level security;
alter table public.sync_runs        force row level security;
alter table public.oauth_states     force row level security;

-- Permisos mínimos: se revoca TODO privilegio preexistente (incluidos los que
-- Supabase concede por defecto a `authenticated`) antes de conceder solo lo
-- imprescindible. RLS restringe además a filas propias.
revoke all privileges on public.bank_connections from public, anon, authenticated;
revoke all privileges on public.accounts         from public, anon, authenticated;
revoke all privileges on public.balances         from public, anon, authenticated;
revoke all privileges on public.transactions     from public, anon, authenticated;
revoke all privileges on public.sync_runs        from public, anon, authenticated;
revoke all privileges on public.oauth_states     from public, anon, authenticated;

grant select, insert, update on public.bank_connections to authenticated;
grant select, insert, update on public.accounts         to authenticated;
grant select, insert, update on public.balances         to authenticated;
grant select, insert, update on public.transactions     to authenticated;
grant select, insert, update on public.sync_runs        to authenticated;
-- oauth_states: ni siquiera `authenticated` tiene acceso directo — solo la
-- Edge Function, que usa la clave de servicio (bypassa RLS/grants por diseño).

-- Políticas: SOLO rol authenticated; cada usuario accede solo a sus propias filas.
drop policy if exists own_bank_connections on public.bank_connections;
create policy own_bank_connections on public.bank_connections
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists own_accounts on public.accounts;
create policy own_accounts on public.accounts
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists own_balances on public.balances;
create policy own_balances on public.balances
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists own_transactions on public.transactions;
create policy own_transactions on public.transactions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists own_sync_runs on public.sync_runs;
create policy own_sync_runs on public.sync_runs
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- oauth_states: sin políticas para authenticated/anon — inaccesible salvo por
-- la Edge Function con clave de servicio. RLS forzada + sin grants = denegado
-- también para el propietario de la tabla salvo bypass explícito de servicio.

-- Verificación atómica incorporada: si el contrato de privilegios no queda
-- exactamente como se pretende, la migración aborta y revierte por completo.
do $$
declare
  t text;
  tables text[] := array[
    'bank_connections', 'accounts', 'balances', 'transactions', 'sync_runs'
  ];
  granted_priv text;
  denied_priv text;
  granted_privs text[] := array['SELECT', 'INSERT', 'UPDATE'];
  denied_privs  text[] := array['DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'];
begin
  foreach t in array tables loop
    foreach granted_priv in array granted_privs loop
      if not has_table_privilege('authenticated', format('public.%I', t), granted_priv) then
        raise exception
          'privilegio faltante: authenticated debería tener % en public.%', granted_priv, t;
      end if;
    end loop;

    foreach denied_priv in array denied_privs loop
      if has_table_privilege('authenticated', format('public.%I', t), denied_priv) then
        raise exception
          'privilegio excesivo: authenticated no debería tener % en public.%', denied_priv, t;
      end if;
    end loop;

    foreach denied_priv in array (granted_privs || denied_privs) loop
      if has_table_privilege('anon', format('public.%I', t), denied_priv) then
        raise exception
          'privilegio indebido: anon no debería tener % en public.%', denied_priv, t;
      end if;
    end loop;
  end loop;

  -- oauth_states: ni authenticated ni anon deben tener ningún privilegio.
  foreach denied_priv in array (granted_privs || denied_privs) loop
    if has_table_privilege('authenticated', 'public.oauth_states', denied_priv) then
      raise exception 'privilegio indebido: authenticated no debería tener % en public.oauth_states', denied_priv;
    end if;
    if has_table_privilege('anon', 'public.oauth_states', denied_priv) then
      raise exception 'privilegio indebido: anon no debería tener % en public.oauth_states', denied_priv;
    end if;
  end loop;
end;
$$;
