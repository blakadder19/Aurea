# Build: Áurea — corte 09, Planificación

Parte del paquete `build_aurea_resto/`. Lee antes `../PLAN.md` (orden, reglas comunes y datos de referencia).
Se construye encima de los cortes anteriores.

Ruta: `/planificacion` · carpeta `src/features/planning/`
Referencia visual exacta: el `.dc.html` de esta carpeta (abre en el navegador).

## Alcance

1. **Panel de controles**: sliders de ingresos, gastos, aportación mensual, rentabilidad esperada e inflación; inputs de compra extraordinaria y pago extra de deuda; select de horizonte (5 / 10 / 20 / 30 años). Cada control muestra su **valor actual con unidad** al lado, y las áreas de agarre miden ≥44 px.
2. **Gráfico de proyección** comparando el escenario editado con el **escenario base**, ambos en la misma escala y con leyenda de texto.
3. Tres **tarjetas de escenario guardado**: optimista / base / pesimista, con su patrimonio proyectado y los supuestos que las diferencian.
4. Bloque de **independencia financiera** con **tasa de retirada editable** (por defecto 4 %): capital objetivo, años restantes y qué cambia si mueves la tasa.
5. Toda la pantalla va marcada **`Simulación`** en la cabecera; ninguna cifra proyectada aparece con el mismo peso visual que un hecho.

Nada más. Si detectas algo que falta, anótalo en `docs/DUDAS.md` y sigue.

## Criterios de aceptación

- [ ] Mover cualquier control actualiza el gráfico y las cifras en vivo.
- [ ] El escenario base sigue visible al editar, para poder comparar.
- [ ] Cada slider muestra su valor con unidad y tiene área de agarre ≥44 px.
- [ ] La tasa de retirada es editable y su efecto se explica en texto, no solo en el gráfico.
- [ ] La etiqueta `Simulación` es visible sin hacer scroll.
- [ ] Sin scroll horizontal a 1440 px; a 390 px el panel de controles se apila sobre el gráfico.
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
