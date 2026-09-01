-- Histórico de saldos ----------------------------------------------------
-- Hasta ahora el gráfico de patrimonio se RECONSTRUÍA hacia atrás desde el
-- saldo de hoy restando movimientos. Eso es exacto mientras haya
-- movimientos, pero no crece con el tiempo: el día que el banco deje de
-- dar los 90 días anteriores, ese tramo desaparece para siempre.
--
-- Esta tabla guarda una foto diaria de los saldos, así el histórico se va
-- acumulando de verdad. Append-only a propósito (sin UPDATE ni DELETE): el
-- saldo que tenías un día ya no cambia. El unique por (usuario, cuenta,
-- día) hace que guardar dos veces el mismo día sea inofensivo.
create table public.balance_snapshots (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  account_id    uuid not null,
  snapshot_date date not null,
  amount_cents  bigint not null,
  currency      text not null default 'EUR',
  created_at    timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, account_id, snapshot_date)
);

create index idx_balance_snapshots_user_date on public.balance_snapshots (user_id, snapshot_date);

alter table public.balance_snapshots enable row level security;
alter table public.balance_snapshots force row level security;

revoke all privileges on public.balance_snapshots from public, anon, authenticated;
grant select, insert on public.balance_snapshots to authenticated;

create policy own_balance_snapshots on public.balance_snapshots
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

do $$
declare
  granted_priv text;
  denied_priv text;
  granted_privs text[] := array['SELECT', 'INSERT'];
  denied_privs text[] := array['UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'];
begin
  foreach granted_priv in array granted_privs loop
    if not has_table_privilege('authenticated', 'public.balance_snapshots', granted_priv) then
      raise exception 'privilegio faltante: authenticated debería tener % en public.balance_snapshots', granted_priv;
    end if;
  end loop;
  foreach denied_priv in array denied_privs loop
    if has_table_privilege('authenticated', 'public.balance_snapshots', denied_priv) then
      raise exception 'privilegio de más: authenticated NO debería tener % en public.balance_snapshots', denied_priv;
    end if;
  end loop;
  foreach denied_priv in array (granted_privs || denied_privs) loop
    if has_table_privilege('anon', 'public.balance_snapshots', denied_priv) then
      raise exception 'privilegio de más: anon NO debería tener % en public.balance_snapshots', denied_priv;
    end if;
  end loop;
end $$;
