-- Subcategorías -----------------------------------------------------------
-- Con 9 categorías planas para ~400 movimientos, "Otros" acababa siendo el
-- 47 % del gasto de un mes: un cajón que no dice nada. Una categoría puede
-- ahora colgar de otra (Alimentación > Supermercado / Restaurantes), y el
-- movimiento se clasifica en la hoja.
alter table public.categories
  add column if not exists parent_id uuid references public.categories (id) on delete set null;

create index if not exists idx_categories_parent on public.categories (parent_id);

-- Solo dos niveles: una subcategoría no puede tener hijas a su vez. Sin
-- esto, una jerarquía profunda rompería el desglose de Informes (que
-- agrupa por padre) y abriría la puerta a ciclos.
create or replace function public.categories_reject_deep_nesting()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.parent_id is not null then
    if new.parent_id = new.id then
      raise exception 'Una categoría no puede ser su propia madre.';
    end if;
    if exists (select 1 from public.categories c where c.id = new.parent_id and c.parent_id is not null) then
      raise exception 'Solo se admiten dos niveles: una subcategoría no puede tener subcategorías.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists categories_reject_deep_nesting on public.categories;
create trigger categories_reject_deep_nesting
  before insert or update on public.categories
  for each row execute function public.categories_reject_deep_nesting();
