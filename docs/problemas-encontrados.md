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
