-- Se acabó el diagnóstico -------------------------------------------------------
--
-- `debug_tag_calls` existió unas horas para responder a una pregunta concreta
-- (¿cuántos ids salían del navegador al etiquetar en lote?) y ya la respondió:
-- salían todos, y lo que fallaba era el refresco de la lista. No la usaba
-- ninguna pantalla y no queda nada que mirar en ella.
drop table if exists public.debug_tag_calls;
