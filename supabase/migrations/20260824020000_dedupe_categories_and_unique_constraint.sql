-- El sembrado inicial de categorías corría en paralelo desde dos sitios
-- (barra lateral + pantalla de Movimientos), y ambos veían "cero categorías"
-- a la vez → duplicados. Se deduplica lo que ya exista y se añade la
-- restricción que lo evita de raíz; el código pasa a usar upsert
-- (onConflict: user_id,name) en vez de insert.

with ranked as (
  select id, user_id, name,
         row_number() over (partition by user_id, name order by created_at) as rn
  from public.categories
),
canonical as (
  select c.user_id, c.name, c.id as canonical_id
  from public.categories c
  join ranked r on r.id = c.id and r.rn = 1
),
dups as (
  select r.id as dup_id, can.canonical_id
  from ranked r
  join public.categories c on c.id = r.id
  join canonical can on can.user_id = c.user_id and can.name = c.name
  where r.rn > 1
)
update public.transactions t
set category_id = d.canonical_id
from dups d
where t.category_id = d.dup_id;

with ranked as (
  select id, user_id, name,
         row_number() over (partition by user_id, name order by created_at) as rn
  from public.categories
),
canonical as (
  select c.user_id, c.name, c.id as canonical_id
  from public.categories c
  join ranked r on r.id = c.id and r.rn = 1
),
dups as (
  select r.id as dup_id, can.canonical_id
  from ranked r
  join public.categories c on c.id = r.id
  join canonical can on can.user_id = c.user_id and can.name = c.name
  where r.rn > 1
)
update public.rules r
set category_id = d.canonical_id
from dups d
where r.category_id = d.dup_id;

with ranked as (
  select id, user_id, name,
         row_number() over (partition by user_id, name order by created_at) as rn
  from public.categories
)
delete from public.categories c
using ranked r
where c.id = r.id and r.rn > 1;

alter table public.categories
  add constraint categories_user_name_unique unique (user_id, name);
