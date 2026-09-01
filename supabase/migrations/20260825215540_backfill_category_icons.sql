update public.categories set icon = case name
  when 'Supermercado' then '🛒'
  when 'Restaurantes' then '🍽️'
  when 'Hogar y facturas' then '🏠'
  when 'Transporte' then '🚗'
  when 'Ocio y suscripciones' then '🎬'
  when 'Ropa y cuidado' then '👕'
  when 'Salud' then '💊'
  when 'Otros' then '📦'
  when 'Ingresos' then '💰'
  else icon
end
where icon is null;
