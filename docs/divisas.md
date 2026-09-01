# Divisas — dónde está el problema

Estado: diagnóstico, 1 sep 2026. Solo la parte del emparejador está arreglada
(se quitó el botón en lote); lo demás está sin tocar a propósito.

## La raíz

Áurea tiene **dos capas con criterios opuestos**:

- **Los saldos SÍ saben de divisas.** Siete sitios filtran a EUR antes de
  sumar, y las cuentas en otra moneda se muestran aparte
  (`useRealHome.ts:113`, `useRealEmergencyFund.ts:73`, `useRealPlanning.ts:19`,
  `useNetWorthHistory.ts:38`, `AccountsPage.tsx:214` y `:221`,
  `RealDetailBreakdowns.tsx:44`).
- **Los movimientos NO.** Ni una sola de las consultas de gasto e ingreso pide
  la columna `currency`, y ninguno de los motores puros la lleva en su
  interfaz: `TransferTxLike`, `RawCharge` y `TxLike` solo tienen
  `amountCents`/`importe`.

Un apunte de 200 zł y uno de 200 € son el mismo número en la base
(`amount_cents = 20000`). Todo lo que compare o sume sin mirar `currency` los
trata como iguales.

## Problema 1 — comparaciones de importe entre divisas

Cuatro sitios. Los cuatro comparan importes de cuentas **distintas**, que es
justo donde puede cambiar la moneda.

| Sitio | Comparación | Riesgo |
|---|---|---|
| `src/lib/internalTransfers.ts:97` | `inc.amountCents !== -out.amountCents` | **Confirmado en datos reales** |
| `src/lib/recurringCalc.ts:130` | `a.lastAmountCents !== b.lastAmountCents`, con `a.accountId !== b.accountId` exigido dos líneas antes | Mismo fallo, misma forma |
| `src/lib/anomalyCalc.ts:39` | `a.importe !== b.importe` para marcar cobro duplicado | Exige mismo comercio, así que solo dispara si un comercio cobra en dos monedas |
| `src/lib/anomalyCalc.ts:81` | mediana por comercio sobre importes de cualquier cuenta | No es igualdad: compara magnitudes. Ver abajo — el camino ya se ejecuta |

### El caso real

El detector de traspasos emparejó **−200,00 EUR (14 ago)** con
**+200,00 PLN (15 ago)**. Los cambios de moneda reales de esos días fueron:

| Sale | Entra | Tasa |
|---|---|---|
| −200,00 EUR | +856,81 PLN | 4,28 |
| −10,00 EUR | +42,47 PLN | 4,25 |
| −47,10 EUR | +200,00 PLN | 4,25 |
| −23,55 EUR | +100,00 PLN | 4,25 |

Las dos patas que emparejó pertenecen a cambios **distintos**. Y como cada
movimiento entra en una sola pareja, las otras seis patas quedaron sin marcar:
999,28 zł entran hoy como si fueran 999,28 € de ingreso.

### `findUnusualAmounts` — medido sobre datos reales

Es el más peligroso de los cuatro porque **falla en silencio**: si la mediana
del comercio queda contaminada, el aviso simplemente no salta y nadie se
entera de que faltaba.

Agrupa solo por `comercio`, sin cuenta ni divisa (`anomalyCalc.ts:71-76`), así
que basta con que un comercio te cobre en dos monedas para que "lo habitual"
mezcle unidades.

**El camino ya se ejecuta hoy**: `Nvidia Corporation` tiene cargos en EUR y en
GBP, y llega justo al mínimo de 3 que exige el detector. Lo que pasa es que
**hoy no produce un resultado incorrecto**, y por casualidad: 11,75 €, 11,71 €
y 9,99 £ están tan cerca que la mediana contaminada (11,71) no dispara nada, y
tampoco debería.

Dicho de otro modo: no hay un fallo visible, hay un fallo a una divisa de
distancia. Con la cuenta PLN (tasa ~4,25) sería grave en las dos direcciones:

- **Falso positivo:** un cargo normal de 50 zł (≈11,75 €) contra una mediana
  en euros de 11,75 supera el umbral de 2,5× y se anuncia como inusual.
- **Falso negativo, silencioso:** un comercio con cargos en zloty (cientos)
  y uno en euros sube la mediana lo bastante como para que el cargo en euros
  no salte nunca.

### De paso: el detector analiza cosas que no son comercios

Independiente de las divisas, y activo ahora. De los 11 avisos que genera hoy,
**4 son de `Instalment repayment`** — una devolución de préstamo tratada como
si fuera una tienda, produciendo textos del tipo *"Instalment repayment te
cobró 193,33 €. Normalmente ronda los 71,73 €"*. No llegan a los 3 que se
pintan en Inicio (los ocupan shein.com, C&N Meats y Dunnes, que son avisos
legítimos), pero están.

Entran al detector como comercios: `Exchanged to PLN`, `Instalment repayment`,
`DEUTDEFFVAC To Alejandro Lopez Molina`, `To MB:c46ff7f4…`,
`To EUR Suscripciones📺` y `To ALEJANDRO LOPEZ MOLINA & ELISABET…`. Cuando se
marquen como traspasos internos, la mayoría desaparecerá sola.

### Lo que se ha hecho

Se quitó el botón "Marcar las N seguras" de `InternalTransfersCard.tsx`.
Auditadas las 5 parejas confirmadas sobre datos reales, **3 estaban mal**, y
las 3 tenían confianza `'alta'` — es decir, el botón las habría marcado solas.

**Queda abierto:** el emparejador sigue sin mirar `currency`, y las filas
individuales siguen mostrando la insignia "Casi seguro" para esas mismas
parejas. La insignia hace la misma promesa que el botón, de una en una.

## Problema 2 — sumas sin convertir *(aparte, no tocar aún)*

Distinto del anterior y no se arregla con la misma corrección.

Las ocho agregaciones de gasto e ingreso suman `amount_cents` de todas las
cuentas sin convertir: Presupuesto (`useRealBudget.ts:117` y `:310`), Informes
(`useRealMonthlyReport.ts:57-74`), las dos tendencias
(`useMonthlyTrend.ts:63`, `useCategoryTrend.ts:61`), Planificación
(`useRealPlanning.ts:93`), Inicio (`useRealHome.ts:234`) y el fondo de
emergencia (`useRealEmergencyFund.ts:58`).

Efecto medido en agosto de 2026, con un viaje a Polonia: la cuenta PLN tiene
18 apuntes —Kaizen Rent 383,22 y 270,36 zł, Sushipak 193,60 zł, bares y
gasolineras— que suman unos **1.200 zł contados como 1.200 €**. Son unos 280 €
reales. El gasto del mes sale inflado en unos 900 €.

Arreglarlo no es filtrar a EUR y ya: eso escondería gasto real. Hace falta
decidir qué tasa se usa y de cuándo (la del día del movimiento, que no está
guardada, o una actual, que reescribiría el pasado cada vez que se mueva el
mercado). Es una decisión de producto, no un parche.

## Problema 3 — Planificación se contradice a sí misma *(bug)*

Esto no es una decisión pendiente, es un fallo. **La misma pantalla aplica los
dos criterios opuestos a la vez:**

- `useRealPlanning.ts:19` filtra a EUR para calcular el patrimonio neto.
- `useRealPlanning.ts:93` **no** filtra nada para calcular las medias de
  ingreso y gasto, que alimentan la proyección.

Así que Planificación proyecta el futuro partiendo de un patrimonio que
excluye las cuentas en otra divisa y de unas medias mensuales que las incluyen
sin convertir. Las dos mitades del cálculo no hablan de lo mismo, y el
resultado no es interpretable ni siquiera aceptando el criterio "solo EUR".

A diferencia del problema 2, aquí sí hay un arreglo defendible sin decidir
nada de producto: aplicar en `:93` el mismo filtro que ya está en `:19`, para
que al menos la pantalla sea coherente consigo misma mientras se decide qué
hacer con las divisas. Sigue sin ser correcto —esconde gasto real, igual que
el problema 2— pero deja de ser contradictorio.
