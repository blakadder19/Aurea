# Áurea — estado actual

Snapshot al cerrar los 13 cortes de `build_aurea_inicio/` + `build_aurea_resto/`.
Para el detalle de cada decisión y por qué se tomó, ver `docs/DUDAS.md` (un apartado por
corte). Este documento es el resumen de referencia: rutas, componentes compartidos,
decisiones estructurales y qué queda explícitamente fuera de alcance.

## Rutas

| Ruta | Pantalla | Carpeta |
|---|---|---|
| `/` | Inicio | `src/features/home/` |
| `/movimientos` | Movimientos | `src/features/transactions/` |
| `/presupuesto` | Presupuesto | `src/features/budget/` |
| `/cuentas` | Cuentas y patrimonio | `src/features/accounts/` |
| `/pagos` | Pagos y suscripciones | `src/features/recurring/` |
| `/objetivos` | Objetivos | `src/features/goals/` |
| `/inversiones` | Inversiones | `src/features/investments/` |
| `/deudas` | Deudas | `src/features/debts/` |
| `/planificacion` | Planificación | `src/features/planning/` |
| `/asistente` | Asistente e insights | `src/features/assistant/` |
| `/ajustes` | Conexiones y ajustes | `src/features/settings/` |
| `/mas` | Más (solo relevante por debajo de 1024 px) | `src/app/MorePage.tsx` |
| `/estados` | Catálogo de estados de sistema (dev) | `src/features/states/` |

Todas las rutas cuelgan de `<AppShell>` (`src/app/AppShell.tsx`), que renderiza el
sidebar de 250 px (`lg:flex`, oculto por debajo de 1024 px) y la navegación inferior de
cinco ítems (`BottomNav`, visible solo por debajo de 1024 px). `NAV_SECTIONS` en
`AppShell.tsx` es la fuente única de la lista de secciones; `MorePage` la reutiliza
filtrando las cuatro que ya están en la barra inferior.

## Componentes compartidos

`src/components/`:
- `Card`, `Badge` (variantes `success`/`warning`/`danger`/`pending` con icono automático;
  `info`/`plum`/`neutral` categóricas sin icono), `ProgressBar` (con `markerPercent`
  opcional — así se construyó el «ritmo esperado» de Presupuesto e Inicio sin un
  componente `PaceBar` aparte, pese a que `PLAN.md` lo nombraba: `markerPercent` cubre el
  mismo caso con menos superficie), `Money` (formato europeo tabular, `signed`/`tone`),
  `SectionLabel`, `SidePanel` (460 px a la derecha en escritorio, hoja inferior por
  debajo de 1024 px), `UndoBar`.
- `states/`: `Skeleton`, `EmptyState`, `ErrorState`, `StaleDataNotice`, `SyncingNotice`,
  `NoSearchResults` — el catálogo completo, con ejemplos, vive en `/estados`.

`src/app/`: `AppShell`, `BottomNav`, `MorePage`.

`src/lib/format.ts`: `formatMoney`, `formatMoneySigned`, `formatPercentSigned`,
`formatDayMonth`, `formatDayMonthYear`, `formatWeekdayDate`, `formatMonthYearLong`.
Cada feature con su propia necesidad de fechas de proyección tiene su propio
`domain.ts` (`goals`, `debts`, `planning`) — no se centralizaron porque cada uno
resuelve un cálculo distinto (proyección de ahorro, amortización de préstamo,
capitalización compuesta), no una utilidad genérica.

## Estado y datos

Cada feature tiene su propio store de Zustand en `features/<nombre>/store.ts` para
estado de interfaz (modo Resumen/Detalle, panel abierto, filtros). Los datos ficticios
viven en `src/data/*.ts`, uno por corte, todos anclados a la fecha de contexto
`CONTEXT_DATE` (miércoles 19 ago 2026) de `src/data/demo.ts`. Las cifras cuadran entre
pantallas por diseño (p. ej. `totalDebt` de `data/debts.ts` = pasivos de Cuentas y
patrimonio = deudas mencionadas en Inicio); las reconciliaciones forzadas están anotadas
en `docs/DUDAS.md`.

## Decisiones estructurales que persisten entre cortes

- **Paneles reales, no maquetas**: todo panel que simula o ajusta algo (`AdjustBudgetPanel`,
  `AllocatePanel`, `ExtraPaymentPanel`) recalcula en vivo con la fórmula real del dominio,
  nunca muestra un número fijo copiado del `.dc.html`.
- **`SidePanel` con foco controlado**: Radix Dialog no devolvía el foco al origen de forma
  fiable en este entorno; todo panel pasa `onCloseAutoFocus` explícito con
  `event.preventDefault()` + `setTimeout(...)` apuntando a un `id` fijo o a un `useRef`
  capturado antes de que el store lo limpie.
- **Tablas → tarjetas de fila por debajo de 1024 px**: cada tabla del proyecto
  (`TransactionsTable`, `AccountsTable`, `PositionsTable`, `DebtsTable`,
  `RecentTransactions`, `BudgetBreakdownTable`, tabla de hitos de `UpcomingTimeline`,
  mapeo CSV de `ImportCsvPanel`) tiene una variante `hidden lg:block` (tabla) y otra
  `lg:hidden` (tarjetas), con las mismas columnas — nunca un subconjunto.
- **Reutilización de lógica de dominio entre features**: `features/assistant/answers.ts`
  reutiliza `goalForecast` (`features/goals/domain.ts`) y `simulateExtraPayment`
  (`features/debts/domain.ts`) en vez de reimplementar los cálculos, para que las
  respuestas del asistente cuadren exactamente con Objetivos y Deudas.
- **Conexiones bancarias como fuente única de verdad para avisos de estado**: el aviso de
  datos desactualizados de Inversiones (MyInvestor) y el de sincronización de Cuentas y
  patrimonio (Revolut) leen el mismo `connections` de `data/settings.ts` que usa Ajustes;
  reconectar desde cualquiera de las tres pantallas actualiza el mismo estado compartido
  (`useSettingsStore`).

## Fuera de alcance explícito (queda para un corte posterior)

- **Conexión bancaria real (Enable Banking) y persistencia (Supabase)**: todo dato es
  ficticio y estático; no hay backend. Los puntos de integración están marcados con
  `// TODO` en:
  - `src/features/settings/store.ts` — `reconnect` (sustituir la simulación por
    reautorización real vía Enable Banking) y `confirmImport` (parseo real del CSV +
    persistencia en Supabase).
  - `src/features/transactions/TransactionsPage.tsx` — la rama `ErrorState` cuando
    `transactions.length === 0` no tiene nada que reintentar todavía; el `onRetry` es un
    no-op documentado a la espera de una llamada de red real.
  Cuando exista `server/` (reutilizando el de `blakadder19/Aurea---Finanzas@master` según
  el alcance original del corte 11), estos son los puntos de enganche.
- **Autenticación de usuario**: la app asume una única usuaria de demostración (Marta
  Ríos, `src/data/demo.ts`); no hay login ni multiusuario.
- **Crear objetivo / crear cuenta / registrar movimiento manual**: los botones
  correspondientes existen en las cabeceras pero son de demostración (no abren un flujo de
  creación) salvo donde el corte explícitamente lo pedía (p. ej. "Registrar aportación" en
  Objetivos e Inversiones, que sí son reales).
- **Arrastre táctil para cerrar hojas inferiores**: las hojas inferiores (corte 12) cierran
  con ✕, `Esc` y clic fuera; el gesto de arrastre que menciona el alcance del corte 12 no
  se implementó (ver `docs/DUDAS.md`, corte 12, duda 2).
- **Empty/Error de Objetivos y Movimientos no alcanzables con los datos actuales**: el
  código está conectado y es real, pero como los datos ficticios nunca están vacíos ni
  fallan, esas dos rutas solo se ven en el catálogo `/estados` (ver `docs/DUDAS.md`,
  corte 13).

## Verificación

Cada corte cerró con `npx tsc -b --noEmit`, `npm run lint` (oxlint), `npm run test`
(vitest, ≥2 pruebas nuevas por corte) y `npm run build` en limpio, además de una
comprobación visual en navegador a 1440 px y ~390–606 px (sin scroll horizontal en
ningún caso). El histórico de commits agrupa los cortes 1–3 (andamiaje, Inicio,
Movimientos y Presupuesto) en un primer commit, y a partir de ahí uno por corte:
`corte 04` … `corte 13`.
