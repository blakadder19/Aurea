-- force row level security en las tres tablas que no lo tenían -------------
--
-- Primera migración escrita después de reconciliar el repositorio con el
-- servidor. Cambia producción: es un cambio deliberado, no documentación.
--
-- Situación: 18 de las 21 tablas de `public` tenían `force row level
-- security`. Las tres que no —`transaction_splits`, `manual_recurring_items` y
-- `planning_scenarios`— sí tienen migración en el servidor; lo que pasa es que
-- en esas tres no se escribió el `force`. No era una decisión de diseño, era
-- una omisión repetida.
--
-- Qué cambia de verdad, sin exagerarlo: `force` hace que la RLS se aplique
-- TAMBIÉN al rol dueño de la tabla. A `authenticated` y `anon` ya se les
-- aplicaba, porque no son dueños ni tienen BYPASSRLS — así que aquí no había
-- ninguna fuga de datos entre usuarios. Y los roles que de verdad se saltan la
-- RLS (`postgres`, `service_role`) lo hacen por atributo BYPASSRLS, con force
-- o sin él, así que las migraciones y los backfills siguen funcionando igual.
--
-- Lo que se gana es poder afirmar una regla entera: "todas las tablas de
-- public tienen RLS activada y forzada". "18 de 21" no es una regla que nadie
-- pueda comprobar.
--
-- Riesgo comprobado antes de aplicar: el vector de rotura sería una función
-- SECURITY DEFINER propiedad del dueño de la tabla, que pasaría a estar
-- sujeta a RLS. No hay ninguna propia en el esquema (las únicas del sistema
-- son `vault.create_secret`, `vault.update_secret` y `pgbouncer.get_auth`,
-- que no tocan tablas de `public`).

alter table public.transaction_splits      force row level security;
alter table public.manual_recurring_items  force row level security;
alter table public.planning_scenarios      force row level security;

-- Red para la próxima --------------------------------------------------------
-- El problema de fondo no era el ajuste, era que tres tablas se quedaron sin
-- `force` y nadie lo detectó hasta que alguien fue tabla por tabla. Esta
-- comprobación es global a propósito: cualquier tabla futura de `public` que
-- nazca sin RLS activada y forzada hará fallar el despliegue, en vez de
-- descubrirse por casualidad.
--
-- Solo mira tablas ordinarias (relkind = 'r'): las vistas, como
-- `transaction_category_amounts`, no llevan RLS propia — heredan la de las
-- tablas a través de `security_invoker`.
do $$
declare
  sin_rls text;
  sin_force text;
begin
  select string_agg(c.relname, ', ' order by c.relname) into sin_rls
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

  if sin_rls is not null then
    raise exception 'Tablas de public sin RLS activada: %', sin_rls;
  end if;

  select string_agg(c.relname, ', ' order by c.relname) into sin_force
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relforcerowsecurity;

  if sin_force is not null then
    raise exception 'Tablas de public con RLS sin forzar: %', sin_force;
  end if;
end $$;
