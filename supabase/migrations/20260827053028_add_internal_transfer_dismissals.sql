-- Traspasos entre cuentas propias ---------------------------------------
-- No hay tabla de "traspasos": se detectan en el cliente emparejando
-- +X/-X entre cuentas distintas (src/lib/internalTransfers.ts), igual que
-- los recurrentes. Confirmar una pareja ya se guarda en
-- transactions.is_internal_transfer; lo único que falta persistir es qué
-- parejas ha DESCARTADO el usuario, para no volver a proponérselas en
-- cada sesión. `active=false` permite deshacer sin DELETE.

create table public.internal_transfer_dismissals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  outgoing_id    uuid not null,
  incoming_id    uuid not null,
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, outgoing_id, incoming_id)
);

create index idx_internal_transfer_dismissals_user on public.internal_transfer_dismissals (user_id);

alter table public.internal_transfer_dismissals enable row level security;
alter table public.internal_transfer_dismissals force row level security;

revoke all privileges on public.internal_transfer_dismissals from public, anon, authenticated;
grant select, insert, update on public.internal_transfer_dismissals to authenticated;

create policy own_internal_transfer_dismissals on public.internal_transfer_dismissals
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

do $$
declare
  granted_priv text;
  denied_priv text;
  granted_privs text[] := array['SELECT', 'INSERT', 'UPDATE'];
  denied_privs text[] := array['DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'];
begin
  foreach granted_priv in array granted_privs loop
    if not has_table_privilege('authenticated', 'public.internal_transfer_dismissals', granted_priv) then
      raise exception 'privilegio faltante: authenticated debería tener % en public.internal_transfer_dismissals', granted_priv;
    end if;
  end loop;
  foreach denied_priv in array denied_privs loop
    if has_table_privilege('authenticated', 'public.internal_transfer_dismissals', denied_priv) then
      raise exception 'privilegio de más: authenticated NO debería tener % en public.internal_transfer_dismissals', denied_priv;
    end if;
  end loop;
  foreach denied_priv in array (granted_privs || denied_privs) loop
    if has_table_privilege('anon', 'public.internal_transfer_dismissals', denied_priv) then
      raise exception 'privilegio de más: anon NO debería tener % en public.internal_transfer_dismissals', denied_priv;
    end if;
  end loop;
end $$;
