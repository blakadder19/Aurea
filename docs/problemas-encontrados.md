# Problemas encontrados de paso

Cosas que aparecen mientras se trabaja en otra cosa. Una línea cada una, con
la fecha y dónde está. No se arreglan en el momento: se apuntan y se sigue.

- ~~**2026-09-17 — El Centro de revisión solo mira los 300 movimientos más
  recientes.**~~ Arreglado el 2026-09-17: `TransactionsPage` se trae el
  histórico entero en cuanto la vista es la de revisión, igual que ya hacía
  con un filtro activo. Con 664 movimientos y 302 más nuevos, las parejas de
  "Exchanged to PLN" del 14–16 de agosto caían en la posición 303.

- **2026-09-17 — El contador del Centro de revisión miente hasta que lo abres.**
  `realReviewCount` (`TransactionsPage.tsx:129`) cuenta lo pendiente sobre la
  lista cargada, que en la vista de tabla y sin filtros son solo los 300
  primeros. La insignia "Centro de revisión (N)" se queda corta hasta que
  entras y se dispara `loadAll()`, momento en el que la cifra cambia sola
  delante del usuario. Arreglarlo bien no es cargarlo todo siempre (eso quita
  el sentido a la paginación): sería contar los pendientes con un `count` en
  Supabase, sin traerse las filas.

## Reglas de clasificación

Los tres salieron de la misma pregunta el 2026-09-18: ¿clasificar a mano crea
regla? No. Son problemas distintos y se apuntan por separado.

- ~~**2026-09-18 — Crear una regla pisaba lo ya clasificado a mano.**~~
  Arreglado el 2026-09-18. La aplicación retroactiva era un `ilike` sin filtro
  de categoría ni de fecha, así que reclasificaba en silencio movimientos que
  el usuario ya había puesto en otra categoría, sin forma de deshacerlo. Ahora
  solo toca los que están sin clasificar, y un movimiento dividido cuenta como
  clasificado aunque su `category_id` sea null.

- ~~**2026-09-18 — La regla usaba la descripción entera y no volvía a encajar.**~~
  Arreglado el 2026-09-18. `match_value` era el nombre completo del comercio,
  así que con sufijos aleatorios (`Alipay*otherretail533`) la regla no capturaba
  ningún movimiento futuro. De los 236 de septiembre, 137 descripciones
  distintas y 120 irrepetibles. Ahora el texto se edita antes de guardar, con el
  nombre completo como valor por defecto.

- **2026-09-18 — Clasificar a mano no propone crear la regla.**
  Las tres vías de clasificar (`updateTransactionCategory`,
  `bulkUpdateTransactionCategory`, `bulkApplyCategorySuggestions`) solo escriben
  `category_id`; la tabla `rules` no se toca. Crear la regla es un paso aparte,
  un botón dentro del panel de detalle de un movimiento concreto, de uno en uno.
  El usuario puede clasificar cien movimientos del mismo comercio sin que nada
  le sugiera nunca que podría hacerlo una sola vez. Sin arreglar a propósito:
  lo que falta no es código sino decidir cuándo ofrecerlo sin volverse pesado
  (¿al segundo movimiento igual?, ¿al guardar?, ¿una sola vez por comercio?).

## Etiquetas

- ~~**2026-09-18 — La banda de acciones en lote se quedaba fuera de pantalla.**~~
  Arreglado el 2026-09-18. Vive dentro del `<main>` con scroll, por encima de
  la tabla, y no estaba pegada: seleccionar una casilla de la fila 200 la
  renderizaba a miles de píxeles por encima de lo que estabas mirando, así que
  parecía que seleccionar no hacía nada. Con 300 movimientos cargados de
  entrada, ese era el caso normal. Ahora es `sticky top-0`.

- **2026-09-18 — Siguiente: un creador de etiquetas en condiciones.**
  Hoy las etiquetas se escriben a mano, en un campo de texto separado por
  comas, y son un `text[]` libre por fila. No hay catálogo, ni autocompletado,
  ni renombrado, ni borrado global, y `bulkAddTag` solo hace `trim()`. Eso hace
  inevitable que acaben conviviendo "viaje", "Viaje" y "viaje-china" como tres
  cosas distintas, y que nadie se entere hasta que los totales no cuadran.

  Las categorías ya tienen icono y color; las etiquetas deberían tener lo
  mismo. La industria (Copilot, Quicken Simplifi, Rocket Money) las trata como
  ciudadano de primera: categoría = tipo de gasto, obligatoria y excluyente;
  etiqueta = contexto (viaje, proyecto, persona), varias por movimiento y
  cruzando categorías.

  Implica tabla `tags` propia (nombre, emoji, color, user_id), tabla puente
  `transaction_tags`, y **migrar el `text[]` actual** — hoy es 1 sola fila con
  la etiqueta «Comida», así que el momento de hacerlo es ahora y no dentro de
  500 etiquetas. Al elegir de una lista en vez de teclear desaparece el
  problema de las variantes, y de paso se arregla lo de abajo.

- **2026-09-18 — El desplegable de etiquetas solo lista las de lo ya cargado.**
  Las opciones salen de `realTransactions` (`TransactionsPage.tsx`), que en la
  vista de tabla y sin filtros son los 300 primeros. Una etiqueta que solo esté
  en movimientos más antiguos no aparece como opción, y hay pescadilla: para
  cargarlo todo hace falta un filtro activo, y para activar ese filtro hace
  falta ver la opción. Los chips de esos movimientos sí funcionan en cuanto se
  ven. Mismo patrón que pasa con el desplegable de cuentas, que lleva así desde
  siempre. Se arregla leyendo las etiquetas distintas con una consulta aparte,
  no trayéndose las filas.

## Otros

- **2026-09-18 — Siguiente: pedir la tasa del saldo de apertura de un pocket.**
  Es la opción C de la conversión FIFO, y va después de la A (que ya está: el
  gasto sin respaldo se queda fuera del total y se muestra al lado).

  El único caso que FIFO no puede convertir es **un pocket con saldo anterior a
  la primera sincronización**. Su `EXCHANGE` está fuera de los 90 días que sirve
  Enable Banking, así que el euro no existe y no se puede pedir.

  A Alejandro le toca en una sola línea (9,99 £, un gasto del 7 jun sin ningún
  cambio a libras detrás) porque abrió el pocket de zlotys **dentro** de la
  ventana y ahí FIFO cubre el 100%. Pero eso es suerte de calendario, no el
  caso normal: **cualquier usuario nuevo llega con saldos preexistentes en
  todas sus cuentas**. Para el producto, el pocket con saldo de apertura es la
  norma y el de Alejandro la excepción. Con la opción A tal cual, un usuario
  que estrene la app vería casi todo su gasto en divisa en "sin convertir".

  La C: el saldo de apertura entra como un lote más de la cola FIFO, con una
  tasa que el usuario introduce a mano una sola vez por pocket. Es un dato
  suyo, no una media ni una estimación — encaja con la regla de "nada de
  medias". Falta decidir dónde se pide y cómo se guarda (¿tabla nueva, o una
  fila sintética de tipo `EXCHANGE`?).
