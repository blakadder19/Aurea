# Problemas encontrados de paso

Cosas que aparecen mientras se trabaja en otra cosa. Una línea cada una, con
la fecha y dónde está. No se arreglan en el momento: se apuntan y se sigue.

- **2026-09-17 — El Centro de revisión solo mira los 300 movimientos más recientes.**
  `useRealTransactions` carga `PAGE_SIZE = 300` y `RealReviewCenter` recibe esa
  lista ya recortada (`TransactionsPage.tsx:297`), así que todo lo que quede por
  debajo del corte no se revisa nunca. Hoy hay 664 movimientos y 302 son más
  nuevos que los cambios de divisa del 14–16 de agosto: las parejas de
  "Exchanged to PLN" caen justo fuera por dos posiciones. Se ven aplicando
  cualquier filtro en Movimientos, porque eso dispara `loadAll()`.
