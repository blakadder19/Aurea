-- Personalización de objetivos: emoji libre (mismo patrón que categories.icon)
-- y un color de una paleta fija para teñir el anillo/barra de progreso.
alter table public.goals
  add column icon text,
  add column color text;
