-- Detalle de deudas reales -------------------------------------------------
-- El saldo de una deuda ya lo tenemos (cuenta con account_function='deuda',
-- sincronizada de verdad). Lo que Enable Banking no da — tipo de interés,
-- cuota, próximo pago — se guarda aquí, opcional, editado a mano. Mismo
-- patrón de seguridad que el resto: revoke-all + grant mínimo, RLS
-- "own_debt_details", FK compuesta (id, user_id), sin DELETE.

create table public.debt_details (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users (id) on delete cascade,
  account_id            uuid not null,
  annual_rate_bps       integer not null default 0,
  monthly_payment_cents bigint,
  next_payment_date     date,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, account_id),
  constraint debt_details_rate_nonneg check (annual_rate_bps >= 0),
  constraint debt_details_payment_nonneg check (monthly_payment_cents is null or monthly_payment_cents >= 0),
  constraint debt_details_account_same_user
    foreign key (account_id, user_id)
    references public.accounts (id, user_id) on delete cascade
);

create index idx_debt_details_user on public.debt_details (user_id);

alter table public.debt_details enable row level security;
alter table public.debt_details force row level security;

revoke all privileges on public.debt_details from public, anon, authenticated;
grant select, insert, update on public.debt_details to authenticated;

create policy own_debt_details on public.debt_details
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

do $$
declare
  granted_priv text;
  denied_priv text;
  granted_privs text[] := array['SELECT', 'INSERT', 'UPDATE'];
  denied_privs text[] := array['DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'];
begin
  foreach granted_priv in array granted_privs loop
    if not has_table_privilege('authenticated', 'public.debt_details', granted_priv) then
      raise exception 'privilegio faltante: authenticated debería tener % en public.debt_details', granted_priv;
    end if;
  end loop;
  foreach denied_priv in array denied_privs loop
    if has_table_privilege('authenticated', 'public.debt_details', denied_priv) then
      raise exception 'privilegio de más: authenticated NO debería tener % en public.debt_details', denied_priv;
    end if;
  end loop;
  foreach denied_priv in array (granted_privs || denied_privs) loop
    if has_table_privilege('anon', 'public.debt_details', denied_priv) then
      raise exception 'privilegio de más: anon NO debería tener % en public.debt_details', denied_priv;
    end if;
  end loop;
end $$;
