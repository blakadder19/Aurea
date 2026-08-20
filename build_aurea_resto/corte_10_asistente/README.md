# Build: Áurea — corte 10, Asistente e insights

Parte del paquete `build_aurea_resto/`. Lee antes `../PLAN.md` (orden, reglas comunes y datos de referencia).
Se construye encima de los cortes anteriores.

Ruta: `/asistente` · carpeta `src/features/assistant/`
Referencia visual exacta: el `.dc.html` de esta carpeta (abre en el navegador).

## Alcance

1. **Preguntas sugeridas** como botones grandes (≥44 px, texto completo, sin truncar): «¿Puedo permitirme un viaje de 1.200 €?», «¿En qué se me va más dinero que el mes pasado?», «¿Cuándo llego a los 6 meses de colchón?», «¿Me conviene amortizar el coche?».
2. Cada **respuesta** es una tarjeta con: badge `Hecho` / `Estimación` / `Recomendación`, **cifra principal** en serif, el **cálculo o la fuente a la vista** (no oculto tras un enlace), enlace a la sección correspondiente y una **acción siguiente** concreta.
3. Las respuestas usan los datos de la demo y cuadran con las otras pantallas (p. ej. el desvío de +145 € del presupuesto, el colchón de 4,5 meses).
4. **Campo de pregunta libre** al final, con nota clara de que en la demo responde a un conjunto fijo de preguntas.
5. Ninguna respuesta emite juicio moral sobre el gasto; el registro es factual y accionable.

Nada más. Si detectas algo que falta, anótalo en `docs/DUDAS.md` y sigue.

## Criterios de aceptación

- [ ] Cada respuesta lleva badge de tipo (hecho / estimación / recomendación) visible.
- [ ] El cálculo o la fuente de cada cifra está a la vista, sin desplegar nada.
- [ ] Cada respuesta enlaza a la sección relevante y ofrece una acción concreta.
- [ ] Las cifras cuadran con Inicio, Presupuesto y Objetivos.
- [ ] El campo libre declara sus límites en la demo en lugar de fingir respuesta abierta.
- [ ] Ningún texto juzga a la usuaria por su gasto.
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
