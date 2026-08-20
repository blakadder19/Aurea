# Build: Áurea — corte 13, Estados de sistema

Parte del paquete `build_aurea_resto/`. Lee antes `../PLAN.md` (orden, reglas comunes y datos de referencia).
Se construye encima de los cortes anteriores.

Ruta: `transversal` · componentes en `src/components/states/` y ajustes en las features existentes
Referencia visual exacta: el `.dc.html` de esta carpeta (abre en el navegador).

## Alcance

Set transversal de estados, aplicado a **todas** las pantallas ya construidas mediante componentes compartidos en `src/components/states/`.

1. **Carga**: skeleton con shimmer que respeta la silueta del bloque real (misma altura y número de filas). Nunca un spinner a pantalla completa.
2. **Vacío**: icono de texto + frase que explica qué falta + **una acción** («Conecta un banco», «Crea tu primer objetivo»).
3. **Error**: icono `!`, explicación de qué ha fallado y dos salidas: `Reintentar` e `Ir a Conexiones`.
4. **Datos desactualizados**: aviso ámbar con la antigüedad del dato («Datos de hace 3 días») + `Reconectar`.
5. **Sincronización en curso**: indicador azul acero con la cuenta que se está sincronizando; el resto de la pantalla sigue usable.
6. **Sin resultados de búsqueda**: dice qué se buscó y ofrece limpiar filtros.
7. **Confirmación con deshacer**: el `UndoBar` ya existente, unificado para toda acción reversible.

Los estados deben quedar **demostrables**: una ruta `/estados` (o un flag de desarrollo) que los liste todos, y su uso real conectado en cada feature.

Nada más. Si detectas algo que falta, anótalo en `docs/DUDAS.md` y sigue.

## Criterios de aceptación

- [ ] Los siete estados existen como componentes compartidos y están usados en las features reales.
- [ ] El skeleton respeta la silueta del contenido que sustituye.
- [ ] Todo estado vacío ofrece exactamente una acción clara.
- [ ] El error ofrece reintentar y ruta a Conexiones.
- [ ] El aviso de datos desactualizados dice la antigüedad en texto.
- [ ] Ningún estado se comunica solo con color o solo con un icono.
- [ ] La ruta de demostración lista los siete estados.
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
