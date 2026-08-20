# Build: Áurea — corte 12, Variantes móviles

Parte del paquete `build_aurea_resto/`. Lee antes `../PLAN.md` (orden, reglas comunes y datos de referencia).
Se construye encima de los cortes anteriores.

Ruta: `transversal` · componentes en `src/components/responsive/` y ajustes en las features existentes
Referencia visual exacta: el `.dc.html` de esta carpeta (abre en el navegador).

## Alcance

Adaptación responsive a **390×844** de las pantallas ya construidas. No es una app aparte: son las mismas rutas y los mismos datos.

1. **Navegación inferior de cinco ítems**: Inicio, Movimientos, Presupuesto, Objetivos, Más. Iconos **con etiqueta de texto**, alto ≥56 px, ítem activo con color y peso.
2. La barra lateral desaparece por debajo de 1024 px y su contenido completo vive en **Más**.
3. **Tablas convertidas en tarjetas de fila**: cada movimiento es una tarjeta con comercio, fecha, cuenta e importe; nunca una tabla con scroll horizontal.
4. Cifras hero: se reducen a 48–56 px pero **siguen siendo serif y tabulares**; el cuerpo se mantiene en 16 px.
5. Paneles laterales pasan a **hoja inferior** a altura casi completa, con la misma jerarquía de contenido y cierre por `✕` y arrastre.
6. Los conmutadores Resumen/Detalle y Tabla/Revisión se mantienen; si no caben, pasan a ancho completo en una fila propia.

Nada más. Si detectas algo que falta, anótalo en `docs/DUDAS.md` y sigue.

## Criterios de aceptación

- [ ] A 390 px no hay scroll horizontal en ninguna pantalla construida.
- [ ] La navegación inferior tiene cinco ítems con texto visible y alto ≥56 px.
- [ ] Ninguna tabla sobrevive como tabla a 390 px: todas son tarjetas de fila.
- [ ] Los datos son idénticos a la versión de escritorio; nada se recorta silenciosamente.
- [ ] Los paneles laterales funcionan como hoja inferior con el mismo contenido.
- [ ] Cuerpo ≥16 px y áreas ≥44 px en móvil también.
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
