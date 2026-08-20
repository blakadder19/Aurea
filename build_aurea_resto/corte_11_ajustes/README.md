# Build: Áurea — corte 11, Conexiones y ajustes

Parte del paquete `build_aurea_resto/`. Lee antes `../PLAN.md` (orden, reglas comunes y datos de referencia).
Se construye encima de los cortes anteriores.

Ruta: `/ajustes` · carpeta `src/features/settings/`
Referencia visual exacta: el `.dc.html` de esta carpeta (abre en el navegador).

## Alcance

1. **Lista de seis conexiones** (bancos y brókeres) con estado explícito: `✓ Sincronizado` + hora, `Sincronizando` (spinner azul), `! Error` + botón `Reconectar`. Cada fila dice qué cuentas trae y cuándo se sincronizó por última vez.
2. **Importación CSV en tres pasos**, con indicador de paso visible:
   1. Mapear columnas (fecha, concepto, importe, cuenta) con previsualización de las primeras filas.
   2. Previsualizar resultado: **altas**, **duplicados detectados** y **rechazos** con el motivo de cada rechazo.
   3. Confirmar: resumen de lo que se va a importar y botón de confirmación.
3. Ajustes básicos: moneda, formato de fecha, inicio del mes presupuestario, y borrado de datos de demostración.
4. Todo el bloque de conexiones va etiquetado **`Demostración`**: nada se conecta de verdad en este corte.
5. La conexión real (Enable Banking + Supabase) llega en un corte posterior reutilizando `server/` de `blakadder19/Aurea---Finanzas@master`; deja los puntos de integración marcados con `TODO` y documentados en `docs/CURRENT.md`.

Nada más. Si detectas algo que falta, anótalo en `docs/DUDAS.md` y sigue.

## Criterios de aceptación

- [ ] Los tres estados de conexión se distinguen por icono y palabra, no solo por color.
- [ ] El error ofrece `Reconectar` en la propia fila, sin menús ocultos.
- [ ] El flujo CSV tiene tres pasos navegables adelante y atrás sin perder lo mapeado.
- [ ] La previsualización separa altas, duplicados y rechazos, y cada rechazo dice su motivo.
- [ ] La etiqueta `Demostración` es visible en el bloque de conexiones.
- [ ] Los puntos de integración real quedan marcados con TODO y documentados.
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
