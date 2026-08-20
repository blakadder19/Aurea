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

## Corte 9 — Planificación

**Duda 1:** el `.dc.html` muestra cifras de proyección fijas («412.600 €» este escenario
frente a «368.200 €» escenario base) que no se pueden derivar de ningún cálculo real a
partir de los valores por defecto de los sliders (que son, precisamente, los mismos que
definen el escenario base) — con esos valores por defecto ambas líneas deberían coincidir.

**Decisión:** se implementa una fórmula real de capitalización (aportación mensual
capitalizada a la rentabilidad real = rentabilidad − inflación; el resto del ahorro
disponible se suma sin capitalizar; el pago extra de deuda se trata como el interés medio
ponderado de las deudas actuales —3,08 %, calculado a partir de `data/debts.ts`— que se
deja de pagar) en vez de copiar las cifras fijas del `.dc.html`. Con esto, "este escenario"
y "escenario base" coinciden al cargar la pantalla (ambos parten de los mismos supuestos)
y solo divergen cuando el usuario mueve un control — es el comportamiento correcto para una
herramienta que se anuncia como "en vivo". La tarjeta «Base» de escenarios guardados usa la
misma fórmula, así que siempre cuadra exactamente con la línea base del gráfico.

**Duda 2:** el bloque de independencia financiera necesita una edad actual para calcular
la «edad estimada de llegada», y ningún corte anterior define la edad de Marta Ríos.

**Decisión:** se asume una edad actual de **34 años** (`ASSUMED_CURRENT_AGE` en
`data/planning.ts`), razonable para el perfil financiero ya establecido (hipoteca, coche,
ingresos ~3.790 €/mes). El capital objetivo sí es un cálculo exacto y verificable: gastos
anuales ÷ tasa de retirada (2.400 × 12 ÷ 4 % = 720.000 €, coincide con el `.dc.html`).

**Duda 3:** el escenario «Pesimista» del `.dc.html` menciona «un imprevisto grande» sin
dar una cifra.

**Decisión:** se asume un imprevisto de **12.000 €** (`compraExtraordinaria` del escenario
pesimista en `data/planning.ts`), restado del patrimonio de partida antes de proyectar.

## Corte 10 — Asistente e insights

**Duda 1:** las cuatro preguntas sugeridas que pide el README («¿Puedo permitirme un viaje
de 1.200 €?», «¿En qué se me va más dinero que el mes pasado?», «¿Cuándo llego a los 6
meses de colchón?», «¿Me conviene amortizar el coche?») no son las mismas que las cuatro
del `.dc.html` («¿Cuánto puedo gastar hoy sin problema?», «¿Por qué voy por encima en
restaurantes?», «¿Cuándo termino de pagar la hipoteca?», «¿Voy bien para el fondo de
emergencia?»), y el `.dc.html` solo tiene respuesta programada para dos de sus cuatro
botones (los otros dos son inertes en la demo original).

**Decisión:** se usan las cuatro preguntas del README (es el documento de alcance
explícito de este corte) y se construye una respuesta real y completa para las cuatro,
no solo para dos — el criterio de aceptación exige badge, cálculo visible, enlace y acción
en «cada respuesta», sin excepción. El patrón visual de la tarjeta de respuesta (cita de
la pregunta, badge de tipo, cifra en serif, caja de cálculo, badge de recomendación
opcional, enlace y acción) se recrea del `.dc.html` tal cual.

**Duda 2:** «¿En qué se me va más dinero que el mes pasado?» no se puede responder con
datos reales porque ningún corte anterior guarda cifras de un mes anterior por categoría
— todos los datos de Presupuesto son del mes en curso (agosto 2026).

**Decisión:** se reutiliza el insight ya canónico de Inicio (`insight` en `data/demo.ts`:
+145 € sobre lo previsto, con el desglose de Restaurantes +109 € y Transporte +36 €) en
vez de inventar un mes anterior de la nada, que arriesgaba contradecir un futuro corte.
Es la decisión más conservadora: la cifra ya existe, ya está verificada y ya se muestra en
Inicio, así que la respuesta cuadra automáticamente con esa pantalla.

**Duda 3:** «¿Me conviene amortizar el coche?» no fija un importe de amortización.

**Decisión:** se simulan 1.500 € (razonable frente al saldo de 6.480 €), reutilizando
`simulateExtraPayment` de `features/debts/domain.ts` — el mismo cálculo del simulador de
la pantalla Deudas, no una fórmula nueva — para que ambas pantallas cuadren si se
comparan.

## Corte 11 — Conexiones y ajustes

**Duda 1:** el punto 3 del alcance del README («Ajustes básicos: moneda, formato de
fecha, inicio del mes presupuestario, y borrado de datos de demostración») no aparece en
ningún sitio del `.dc.html`, que solo muestra la lista de conexiones y el asistente de
importación CSV.

**Decisión:** se añade una tarjeta «Ajustes básicos» propia (`SettingsBasics.tsx`) con los
cuatro controles que pide el README, siguiendo el mismo lenguaje visual del resto de la
pantalla (selects de 44 px, tarjeta con el mismo padding). «Borrar datos de demostración»
no borra nada de verdad — es una demo sin backend — pero sí es interactivo: confirma con
un badge en vez de quedarse inerte, coherente con el resto de acciones «reales» del
proyecto (AdjustBudgetPanel, AllocatePanel, ExtraPaymentPanel).

**Duda 2:** el criterio de aceptación exige que el asistente CSV navegue «adelante y
atrás sin perder lo mapeado», pero el `.dc.html` solo tiene botones `Continuar` (nunca
`Atrás`) y no expone ninguna forma de retroceder.

**Decisión:** se añade un botón «Atrás» en los pasos 2 y 3, y los círculos de paso 1/2/3
son también botones clicables hacia cualquier paso ya alcanzado (`maxStepReached` en
`features/settings/store.ts`). El mapeo de columnas vive en el store, no en estado local
del paso 1, así que sobrevive a ir y volver.

**Duda 3:** el README pide mapear cuatro campos (fecha, concepto, importe, cuenta) pero
el `.dc.html` solo muestra tres filas de mapeo (sin «cuenta»).

**Decisión:** se añade una cuarta fila `Cuenta_Origen → Cuenta`, seleccionable como las
otras tres, para cubrir el alcance completo del README.

**Puntos de integración real marcados con TODO** (criterio de aceptación explícito):
`features/settings/store.ts`, acciones `reconnect` y `confirmImport` — ambas simulan el
resultado con `setTimeout`/datos fijos de `data/settings.ts` en vez de llamar a Enable
Banking o Supabase. Se documentarán también en `docs/CURRENT.md` al cerrar todos los
cortes.

## Corte 12 — Variantes móviles

Corte transversal: no añade pantallas, adapta las 11 ya construidas a 390×844. No
implementa una app aparte, así que se tocan `AppShell` (nueva `BottomNav`, nueva
`MorePage` en `/mas`), el componente compartido `SidePanel` (hoja inferior por debajo de
1024 px) y las 8 tablas del proyecto (`TransactionsTable`, `AccountsTable`,
`PositionsTable`, `DebtsTable`, `RecentTransactions`, `BudgetBreakdownTable`,
`UpcomingTimeline` —tabla de hitos—, `ImportCsvPanel`), cada una con una variante de
tarjetas de fila (`hidden lg:block` / `lg:hidden`) que muestra exactamente las mismas
columnas que la tabla, no un subconjunto.

**Duda 1:** el `.dc.html` dibuja la navegación inferior con un punto de color en vez de un
icono real («Iconos con etiqueta de texto» en el alcance del README).

**Decisión:** se sigue el patrón del `.dc.html` (punto + etiqueta de texto) en vez de
introducir una librería de iconos nueva: ningún corte anterior usa iconos gráficos en
ningún sitio de la aplicación (solo los glifos de texto ✓/▲/!/◌ para estado), así que un
set de iconos solo para esta barra rompería la consistencia visual del proyecto. La
etiqueta de texto —el requisito explícito— está siempre presente.

**Duda 2:** el alcance pide que las hojas inferiores cierren «por ✕ y arrastre», pero
arrastre (gesto táctil con física de scroll) no lo ofrece Radix Dialog de fábrica y
añadirlo es un cambio sustancial de comportamiento, no una clase responsive.

**Decisión:** se implementa el cierre por ✕, `Esc` y clic fuera (ya heredado de
`SidePanel`, verificado en el simulador de pago extra de Deudas), y se deja fuera el
arrastre táctil. Los tres mecanismos de cierre que sí se implementan ya cubren la regla
común «cierre con ✕, Esc y clic fuera»; el arrastre es un extra de la variante móvil, no
un requisito de accesibilidad.

**Duda 3:** ni el README ni el `.dc.html` dan un diseño de tarjeta de fila para las
tablas de Cuentas, Inversiones, Deudas ni el mapeo CSV de Ajustes (el `.dc.html` solo
diseña el patrón para Movimientos y las categorías de Presupuesto).

**Decisión:** se extiende el mismo patrón de tarjeta (título + importe a la derecha +
línea secundaria con el resto de columnas) a las cuatro tablas restantes, manteniendo
todas las columnas de la versión de escritorio — ninguna cifra se omite en la variante
móvil.

## Corte 13 — Estados de sistema

Corte transversal: siete componentes compartidos en `src/components/states/` (`Skeleton`,
`EmptyState`, `ErrorState`, `StaleDataNotice`, `SyncingNotice`, `NoSearchResults`; el
séptimo, `UndoBar`, ya existía desde el corte 1 y ya se usaba en cinco features, así que
no se duplica). Catálogo demostrable en `/estados` (enlazado desde una sección
«Desarrollo» al final de Más, sin tocar las secciones del sidebar que el corte 11 dejó
cerradas).

**Duda 1:** los datos ficticios del proyecto son estáticos — no hay backend real que
pueda fallar, tardar o traer resultados vacíos —, así que «vacío» y «error» no tienen
ningún disparador natural en los datos actuales de Objetivos ni de Movimientos.

**Decisión:** en vez de fabricar un interruptor de desarrollo en cada pantalla, se
conectan los siete estados donde sí hay una razón real:
- `Skeleton` en `AvailableTodayCard` (Inicio): carga real de 600 ms en cada visita,
  respetando la silueta del bloque (mismo alto de cifra hero, mismas dos líneas de
  párrafo).
- `StaleDataNotice` en Inversiones y `SyncingNotice` en Cuentas y patrimonio: ambos leen
  el mismo `connections` de `data/settings.ts` que ya usa la pantalla Ajustes (MyInvestor
  en error, Revolut sincronizando) — no son datos nuevos, son los mismos, así que
  «Reconectar ahora» en Inversiones dispara el mismo `reconnect()` del store de Ajustes y
  el aviso desaparece de verdad en las dos pantallas a la vez.
- `NoSearchResults` sustituye el texto plano que ya tenía `TransactionsTable` para
  búsquedas sin resultado — se demuestra buscando cualquier texto que no exista en
  Movimientos, y «Quitar filtros» limpia la búsqueda de verdad.
- `EmptyState` (Objetivos, si `goals.length === 0`) y `ErrorState` (Movimientos, si
  `transactions.length === 0`) quedan como rutas de código reales pero no alcanzables con
  los datos fijos actuales — la decisión más conservadora era dejarlas conectadas sin
  inventar un modo "vacío" o "caído" temporal solo para poder verlas, ya que `/estados`
  ya las muestra sin necesidad de mutar datos reales. El botón "Reintentar" de ese
  `ErrorState` no tiene nada que reintentar todavía (no hay backend); queda documentado
  como punto de integración real, igual que `reconnect`/`confirmImport` del corte 11.
