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
