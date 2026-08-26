-- rules necesitaba poder borrarse desde Ajustes (gestión de reglas de
-- clasificación) — mismo patrón que grant_delete_categories: el resto de
-- privilegios y la policy own_rules ya cubrían DELETE via RLS, solo faltaba
-- el grant a nivel de tabla.
grant delete on public.rules to authenticated;
