-- TEMPORAL — diagnóstico de "etiquetar en lote solo etiqueta uno" ---------------
--
-- No la usa ninguna pantalla. Existe para responder a una pregunta concreta:
-- cuántos ids salen de verdad del navegador cuando se pulsa "Añadir", porque
-- ni los tests con mocks ni las llamadas a mano contra la API reproducen la
-- pérdida. Se apunta lo que cree el store, lo que ve el componente y lo que
-- recibe `bulkAddTag`, para saber en cuál de los tres saltos se pierden.
--
-- BORRAR esta tabla y la instrumentación del cliente en cuanto se sepa.
create table if not exists public.debug_tag_calls (
  id            bigserial primary key,
  at            timestamptz not null default now(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  origen        text not null,
  tag           text,
  /** Lo que tiene el store leído en el momento del clic, sin pasar por React. */
  store_count   integer,
  /** Lo que tenía el componente en el render desde el que se llamó. */
  closure_count integer,
  ids           uuid[],
  nota          text
);

alter table public.debug_tag_calls enable row level security;
alter table public.debug_tag_calls force row level security;

create policy own_debug_tag_calls_insert on public.debug_tag_calls
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy own_debug_tag_calls_select on public.debug_tag_calls
  for select to authenticated using (user_id = (select auth.uid()));

grant insert, select on public.debug_tag_calls to authenticated;
grant usage on sequence public.debug_tag_calls_id_seq to authenticated;
