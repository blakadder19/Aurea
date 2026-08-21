-- Áurea · Fija search_path en set_updated_at (aviso del linter de seguridad
-- de Supabase: function_search_path_mutable). Sin este ajuste, la función
-- resuelve nombres de objeto según el search_path de quien la invoca, lo que
-- abre la puerta a un "search_path hijacking" si alguien crea un objeto con
-- el mismo nombre en un esquema anterior en la ruta de resolución.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
