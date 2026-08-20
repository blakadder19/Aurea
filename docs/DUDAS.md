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
