# Dudas y decisiones tomadas durante los cortes 4–13

Registro de puntos donde un corte contradecía algo ya construido o faltaban datos.
Para cada uno: decisión tomada (la más conservadora) y por qué.

## Corte 4 — Cuentas y patrimonio

**Duda:** `Áurea - Cuentas y patrimonio.dc.html` da «Piso · valor estimado» = 285.000,00 €.
Sumando esa cifra a las demás filas de la tabla (7.246,57 para gastar + 12.400 ahorro +
2.150 hucha + 38.920 fondo + 4.310 cripto + 285.000 piso = 350.026,57 €) el total **no**
cuadra con el KPI canónico de Activos (344.526,57 €, fijado en `PLAN.md` y ya usado en
Inicio desde el corte 1): sobran exactamente 5.500 €.

**Decisión:** corregir el valor del piso a **279.500,00 €**, que es la única cifra que
hace cuadrar la suma exacta con 344.526,57 €. Es el ajuste menos disruptivo porque el
piso es un dato nuevo de este corte (no lo usa ningún corte anterior ni posterior según
`PLAN.md`), mientras que el resto de cifras de la tabla (fondo, cripto, ahorro, hucha,
cuentas para gastar) están ancladas a Inicio y a `PLAN.md` y no se pueden tocar.

Con esta corrección, los desgloses de Detalle también cuadran exactamente:
- Efectivo y cuentas (7.246,57 + 12.400 + 2.150) + Inversiones y cripto (43.230) +
  Inmuebles (279.500) = 344.526,57 € = Activos.
- Hipoteca (148.320) + Préstamo coche/tarjeta/portátil (8.042,30) = 156.362,30 € = Pasivos.

## Corte 5 — Pagos y suscripciones

**Duda 1:** los subtotales del `.dc.html` («Suscripciones · 105,80 €/mes», «Otros
recurrentes · 285,20 €/mes», cabecera «547,60 € recurrentes al mes») no cuadran con la
suma real de las líneas que el propio `.dc.html` muestra (p.ej. Netflix 13,99 + Spotify
11,99 + Filmin 7,99 + Gimnasio 39,90 = 73,87 €, no 105,80 €).

**Decisión:** los subtotales de cada bloque y el total de cabecera se **calculan en
código** a partir de las líneas reales (`recurringItems`), nunca se copian del `.dc.html`.
Así siempre cuadran con lo que se ve en pantalla.

**Duda 2:** el criterio de aceptación exige que los importes cuadren con los próximos 14
días de Inicio para Netflix, Spotify, Luz, Internet, Coche, Seguro, **Hipoteca** y
Gimnasio — pero el `.dc.html` no incluye ninguna fila de Hipoteca en la lista.

**Decisión:** se añade Hipoteca (612,40 €, mensual, próximo cargo 1 sep) al bloque «Otros
recurrentes», con el mismo importe que en Inicio. La Tarjeta (842,30 €) del mismo listado
de criterios **no** se añade como recurrente: es un pago de saldo de tarjeta variable
mes a mes, no una cuota fija, así que no encaja como "pago recurrente"; no se muestra
ningún importe de tarjeta en esta pantalla que pudiera contradecir Inicio.
