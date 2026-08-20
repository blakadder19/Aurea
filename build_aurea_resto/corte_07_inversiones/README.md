# Build: Áurea — corte 07, Inversiones

Parte del paquete `build_aurea_resto/`. Lee antes `../PLAN.md` (orden, reglas comunes y datos de referencia).
Se construye encima de los cortes anteriores.

Ruta: `/inversiones` · carpeta `src/features/investments/`
Referencia visual exacta: el `.dc.html` de esta carpeta (abre en el navegador).

## Alcance

1. Cabecera con **valor actual 38.920 €**, curva de evolución (Recharts, línea verde, sin relleno) y etiqueta visible `Cotizaciones simuladas · 08:42`.
2. Separación explícita **Aportado 32.400 €** / **Rendimiento +6.520 €** / **Rentabilidad +20,1 %** — nunca mezclar aportación con ganancia.
3. **Tabla de posiciones**: nombre, unidades, coste medio, valor actual, rentabilidad (en € y en %), con cripto 4.310 € sobre 3.000 € aportados como una posición más.
4. **Asignación actual frente a objetivo**: una barra por clase de activo con **marca vertical del objetivo**, más una **propuesta de rebalanceo** que dice qué mover y cuánto, etiquetada como `Recomendación`.
5. Modo **Detalle**: añade columnas de aportado y peso en cartera, y desglose por tipo de producto.

Nada más. Si detectas algo que falta, anótalo en `docs/DUDAS.md` y sigue.

## Criterios de aceptación

- [ ] 32.400 + 6.520 = 38.920 y +20,1 % cuadra con esas cifras.
- [ ] La etiqueta de cotizaciones simuladas está visible con hora, no en letra pequeña gris.
- [ ] La rentabilidad se muestra en € y en %, con signo explícito.
- [ ] Cada barra de asignación tiene su marca de objetivo y la propuesta de rebalanceo dice importes concretos.
- [ ] La propuesta de rebalanceo va etiquetada como recomendación, no como hecho.
- [ ] Detalle añade columnas sin duplicar la tabla.
- [ ] Ningún texto de cuerpo por debajo de 16 px ni etiqueta por debajo de 13 px; cifras tabulares.
- [ ] Foco de teclado visible en todo elemento interactivo; áreas ≥ 44 px.
- [ ] Sin scroll horizontal a 1440 px ni a 390 px.
- [ ] `npm run lint`, `npm run test` y `npm run build` limpios, con al menos dos pruebas nuevas.

## Reglas comunes (aplican a todos los cortes)

- Se construye **encima** de los cortes anteriores: no se reescribe el shell, ni los tokens, ni componentes ya existentes.
- Reutiliza `Card`, `Badge`, `ProgressBar`, `PaceBar`, `Money`, `SectionLabel`, `SidePanel`, `UndoBar`, `lib/format.ts`. Si necesitas una variante, añade una prop; no dupliques el componente.
- Cuerpo ≥16 px, etiquetas ≥13 px, áreas interactivas ≥44 px, foco de teclado visible (3 px `#0F6B4F`).
- Estado = color + icono + palabra (`✓ Al día`, `▲ Por encima`, `! Requiere revisión`, `◌ Por confirmar`). Nunca solo color.
- Formato europeo tabular: `5.383,24 €`, `+0,7 %`, `19 ago 2026`. Negativos con `−` explícito.
- Los titulares dicen la conclusión, no la categoría.
- Ningún icono sin etiqueta de texto. Ningún menú de tres puntos como única vía a una acción.
- Cifras estimadas o simuladas van siempre etiquetadas (`Estimación`, `Simulación`, `Cotizaciones simuladas`, `Demostración`).
- Paneles laterales: overlay `rgba(22,26,25,0.35)` + panel derecho de 460 px, cierre con `✕`, `Esc` y clic fuera, foco devuelto al origen.
- Sin degradados protagonistas, glassmorphism, gamificación, confeti ni tono moralizante sobre el gasto.
- Sin scroll horizontal a 1440 px ni a 390 px: las tablas scrollean en su propia tarjeta, nunca la página.
- Cada corte cierra con `npm run lint`, `npm run test` y `npm run build` limpios y al menos dos pruebas nuevas.
- Los `.dc.html` son **referencias de diseño**, no código: recréalos con los patrones del proyecto, no los copies al bundle.
