# Build: Áurea — corte 05, Pagos y suscripciones

Parte del paquete `build_aurea_resto/`. Lee antes `../PLAN.md` (orden, reglas comunes y datos de referencia).
Se construye encima de los cortes anteriores.

Ruta: `/pagos` · carpeta `src/features/recurring/`
Referencia visual exacta: el `.dc.html` de esta carpeta (abre en el navegador).

## Alcance

1. Conmutador **Lista cronológica / Calendario mensual**.
2. **Lista** agrupada en tres bloques con etiqueta de sección: `Facturas esenciales`, `Suscripciones`, `Otros recurrentes`. Cada línea: concepto, cuenta, próxima fecha, importe tabular, y periodicidad.
3. Tres **casos destacados** con fondo de color y explicación en lenguaje llano:
   - **Spotify** sube de 10,99 € a 11,99 € el 24 ago → ámbar, acciones `Aceptar el cambio` / `Ver suscripción`.
   - **Filmin**: prueba gratuita que renueva a 7,99 € → rojo, acciones `Cancelar antes del 14 sep` / `Ver suscripción`.
   - **Gimnasio**: posible duplicado (dos cargos parecidos) → azul acero, acciones `Comparar cargos` / `No es duplicado`.
4. **Calendario mensual**: rejilla del mes con los importes del día en cada celda; el total del día en una sola línea, sin envolver. Días sin cargos quedan vacíos, no con un cero.
5. **Panel de detalle de suscripción**: importe actual, periodicidad, cuenta de cargo, **historial de importes** (con el cambio de precio marcado) y acciones `Pausar` / `Cancelar` / `Cambiar cuenta`.
6. Total del mes en la cabecera: coste recurrente mensual y anualizado.

Nada más. Si detectas algo que falta, anótalo en `docs/DUDAS.md` y sigue.

## Criterios de aceptación

- [ ] El conmutador Lista/Calendario no navega ni recarga.
- [ ] Los tres casos destacados llevan color + icono + palabra y explicación en lenguaje llano.
- [ ] En el calendario ningún importe se envuelve en dos líneas ni se solapa.
- [ ] El panel de suscripción muestra el historial con la subida de precio identificada.
- [ ] Los importes cuadran con los próximos 14 días de Inicio (Netflix, Spotify, Luz, Internet, Coche, Seguro, Hipoteca, Gimnasio, Tarjeta).
- [ ] Cancelar o pausar deja barra de deshacer.
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
