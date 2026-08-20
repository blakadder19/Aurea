# Build: Áurea — corte 06, Objetivos

Parte del paquete `build_aurea_resto/`. Lee antes `../PLAN.md` (orden, reglas comunes y datos de referencia).
Se construye encima de los cortes anteriores.

Ruta: `/objetivos` · carpeta `src/features/goals/`
Referencia visual exacta: el `.dc.html` de esta carpeta (abre en el navegador).

## Alcance

1. **Fondo de emergencia** medido en **meses de gastos cubiertos**: 4,5 de 6 (8.900 € de 11.880 €), con barra y **marca del ritmo previsto**; titular-conclusión del tipo «Te faltan 1,5 meses de colchón».
2. Dos **tarjetas de objetivo** con badge de estado y fecha estimada:
   - **Viaje a Japón** 2.150 € de 4.000 € — con la nota de que la hucha aún está `◌ Por confirmar`.
   - **Entrada para la reforma** 3.500 € de 15.000 €.
3. Panel **Registrar aportación**: se introduce un importe y se **reparte entre objetivos**; el panel muestra en vivo cómo cambia la **fecha estimada** de cada objetivo antes de confirmar.
4. Cada objetivo dice cuánto hay que apartar al mes para llegar a su fecha objetivo, y la fecha estimada al ritmo actual.

Reutiliza la lógica de dominio probada de `blakadder19/Aurea---Finanzas@master` en `src/features/goals/*.ts` (cálculo de ritmo y fecha estimada) en vez de reinventarla; adáptala a los tipos de este proyecto.

Nada más. Si detectas algo que falta, anótalo en `docs/DUDAS.md` y sigue.

## Criterios de aceptación

- [ ] El fondo de emergencia se expresa en meses cubiertos, con la marca de ritmo previsto visible.
- [ ] Las tres cifras cuadran: 8.900/11.880, 2.150/4.000, 3.500/15.000.
- [ ] Repartir una aportación actualiza la fecha estimada de cada objetivo **antes** de confirmar.
- [ ] La hucha «Viaje Japón» se marca como por confirmar y se explica qué implica.
- [ ] Ninguna barra desborda su pista; ningún objetivo cumplido usa confeti ni gamificación.
- [ ] Confirmar una aportación deja barra de deshacer.
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
