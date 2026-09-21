-- Etiquetas como ciudadano de primera ------------------------------------------
--
-- Hasta ahora eran un `text[]` libre en cada movimiento: sin catálogo, sin
-- autocompletado, sin renombrar ni borrar. Con eso es inevitable que acaben
-- conviviendo "viaje", "Viaje" y "viaje-china" como tres cosas distintas, y que
-- nadie se entere hasta que los totales no cuadran.
--
-- Categoría y etiqueta no son lo mismo y por eso van en sitios distintos: la
-- categoría es el TIPO de gasto, obligatoria y excluyente; la etiqueta es el
-- CONTEXTO (un viaje, un proyecto, una persona), varias por movimiento y
-- cruzando categorías.

create table if not exists public.tags (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  emoji      text,
  -- Una ranura de la paleta (`--color-cat-N` en index.css), no un hex libre:
  -- así las etiquetas se ven como el resto de la app y siguen funcionando si
  -- algún día cambia el tema.
  color      text not null default 'cat-1' check (color in ('cat-1','cat-2','cat-3','cat-4','cat-5','cat-6','cat-7','cat-8')),
  created_at timestamptz not null default now(),
  constraint tags_name_no_vacio check (btrim(name) <> '')
);

-- Sin distinguir mayúsculas: "Viaje" y "viaje" son la misma etiqueta, que es
-- justo el problema que esta tabla viene a resolver.
create unique index if not exists tags_user_lower_name on public.tags (user_id, lower(name));

create table if not exists public.transaction_tags (
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  tag_id         uuid not null references public.tags (id) on delete cascade,
  user_id        uuid not null references auth.users (id) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (transaction_id, tag_id)
);

create index if not exists transaction_tags_tag on public.transaction_tags (tag_id);
create index if not exists transaction_tags_user on public.transaction_tags (user_id);

alter table public.tags             enable row level security;
alter table public.transaction_tags enable row level security;
alter table public.tags             force  row level security;
alter table public.transaction_tags force  row level security;

create policy own_tags_all on public.tags
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy own_transaction_tags_all on public.transaction_tags
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.tags             to authenticated;
grant select, insert, update, delete on public.transaction_tags to authenticated;

-- Migrar lo que ya había ---------------------------------------------------------
--
-- `distinct on (user_id, lower(name))` porque el text[] permitía variantes de
-- mayúsculas que el índice nuevo ya no deja pasar: gana la primera.
insert into public.tags (user_id, name)
select distinct on (t.user_id, lower(etiqueta)) t.user_id, btrim(etiqueta)
  from public.transactions t
  cross join lateral unnest(t.tags) as etiqueta
 where btrim(etiqueta) <> ''
 order by t.user_id, lower(etiqueta), t.created_at
on conflict do nothing;

insert into public.transaction_tags (transaction_id, tag_id, user_id)
select distinct t.id, g.id, t.user_id
  from public.transactions t
  cross join lateral unnest(t.tags) as etiqueta
  join public.tags g on g.user_id = t.user_id and lower(g.name) = lower(btrim(etiqueta))
on conflict do nothing;

-- Una sola fuente de verdad: dejar la columna sería garantizar que las dos se
-- desincronizan.
alter table public.transactions drop column if exists tags;
