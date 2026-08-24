-- Categorías y reglas de clasificación --------------------------------------
-- Mismo patrón de seguridad que el resto del esquema: revoke-all + grant
-- mínimo, RLS "own_*", FKs compuestas (id, user_id) para atar cada fila
-- estructuralmente a su usuario, sin DELETE.

create table public.categories (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  name           text not null,
  category_group text not null,
  icon           text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (id, user_id),
  constraint categories_group_check check (category_group in (
    'ingresos', 'vivienda', 'alimentacion', 'transporte', 'ocio',
    'suscripciones', 'salud', 'compras', 'finanzas', 'transferencias'
  ))
);

create table public.rules (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  match_field   text not null check (match_field in ('merchant', 'description', 'account')),
  match_value   text not null,
  category_id   uuid not null,
  applied_count integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (id, user_id),
  constraint rules_category_same_user
    foreign key (category_id, user_id)
    references public.categories (id, user_id) on delete cascade
);

-- Columnas de clasificación en transactions ----------------------------------
-- Separadas a propósito de las columnas que escribe la sincronización
-- bancaria (enable-banking-save nunca las toca), para que un re-sync nunca
-- pise la clasificación del usuario.
alter table public.transactions
  add column category_id  uuid,
  add column needs_review boolean not null default false,
  add column user_note    text,
  add column tags         text[] not null default '{}';

alter table public.transactions
  add constraint transactions_category_same_user
  foreign key (category_id, user_id)
  references public.categories (id, user_id);

create index idx_categories_user on public.categories (user_id);
create index idx_rules_user on public.rules (user_id);
create index idx_transactions_user_category on public.transactions (user_id, category_id);

alter table public.categories enable row level security;
alter table public.categories force row level security;
alter table public.rules enable row level security;
alter table public.rules force row level security;

revoke all privileges on public.categories from public, anon, authenticated;
revoke all privileges on public.rules      from public, anon, authenticated;

grant select, insert, update on public.categories to authenticated;
grant select, insert, update on public.rules      to authenticated;

create policy own_categories on public.categories
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy own_rules on public.rules
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Verificación de contrato ---------------------------------------------------
do $$
declare
  t text;
  granted_priv text;
  denied_priv text;
  granted_privs text[] := array['SELECT', 'INSERT', 'UPDATE'];
  denied_privs text[] := array['DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'];
begin
  foreach t in array array['categories', 'rules'] loop
    foreach granted_priv in array granted_privs loop
      if not has_table_privilege('authenticated', format('public.%I', t), granted_priv) then
        raise exception 'privilegio faltante: authenticated debería tener % en public.%', granted_priv, t;
      end if;
    end loop;
    foreach denied_priv in array denied_privs loop
      if has_table_privilege('authenticated', format('public.%I', t), denied_priv) then
        raise exception 'privilegio de más: authenticated NO debería tener % en public.%', denied_priv, t;
      end if;
    end loop;
    foreach denied_priv in array (granted_privs || denied_privs) loop
      if has_table_privilege('anon', format('public.%I', t), denied_priv) then
        raise exception 'privilegio de más: anon NO debería tener % en public.%', denied_priv, t;
      end if;
    end loop;
  end loop;
end $$;
