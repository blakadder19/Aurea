# Áurea — estado actual

Snapshot tras la fase de datos reales (login, Supabase, sincronización bancaria vía
Enable Banking) y la fase de funciones con IA (categorización, asistente libre) que
siguieron al cierre de los 13 cortes de demostración. La versión anterior de este
documento describía solo la demo estática — ya no es el estado del proyecto; se
conserva el detalle histórico corte a corte en `docs/DUDAS.md`. Este documento es el
resumen de referencia: rutas, componentes compartidos, cómo convive el modo real con la
demo pública, decisiones estructurales, y qué queda explícitamente fuera de alcance.

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
| `/informes` | Informes (cierre de mes) | `src/features/reports/` |
| `/asistente` | Asistente e insights | `src/features/assistant/` |
| `/ajustes` | Conexiones y ajustes | `src/features/settings/` |
| `/mas` | Más (solo relevante por debajo de 1024 px) | `src/app/MorePage.tsx` |
| `/estados` | Catálogo de estados de sistema (dev) | `src/features/states/` |
| `/entrar` | Login por enlace mágico | `src/features/auth/LoginPage.tsx` |
| `/ajustes/banco/callback` | Vuelta de Enable Banking tras autorizar | `src/features/settings/BankConnectionCallback.tsx` |

Todas las rutas de la app (salvo `/entrar` y el callback de banco) cuelgan de
`<AppShell>` (`src/app/AppShell.tsx`), que renderiza el sidebar de 250 px (`lg:flex`,
oculto por debajo de 1024 px) y la navegación inferior de cinco ítems (`BottomNav`,
visible solo por debajo de 1024 px). `NAV_SECTIONS` en `AppShell.tsx` es la fuente única
de la lista de secciones; `MorePage` la reutiliza filtrando las cuatro que ya están en
la barra inferior. El bloque de identidad del sidebar/`MorePage` (`useIdentity()` en
`AppShell.tsx`) muestra el correo real de la sesión con sesión iniciada, o la persona de
demostración sin sesión — nunca la de demostración con sesión real.

## Demo pública vs. sesión real

Áurea sirve dos experiencias desde el mismo código, decididas por si hay o no una
sesión de Supabase activa (`useAuthStore`, login por enlace mágico en `/entrar`):

- **Sin sesión**: la demo pública original, íntegra — datos ficticios de `src/data/*.ts`,
  ancladas a `CONTEXT_DATE` (miércoles 19 ago 2026). No ha cambiado.
- **Con sesión real**: cada pantalla lee sus propios datos de Supabase (una cuenta real
  conectada vía Enable Banking a un banco — hoy Revolut — más, opcionalmente, cuentas
  manuales sin banco detrás). El patrón es el mismo en todas las pantallas reales:
  - Un hook `useReal<Cosa>()` por dominio (`useRealAccounts`, `useRealTransactions`,
    `useRealBudget`, `useRealGoals`, `useRealDebts`, `useRealInvestments`,
    `useRealRecurring`, `useRealSettings`, `useRealConnections`, `useRealAnswers`,
    `useRealHome`, `useNetWorthHistory`, `useRealMonthlyReport`) que expone
    `{ loading, <dato>: T | null, refetch? }` — `null` significa "sin sesión" o
    "todavía cargando", nunca "cero elementos" (eso es `T[]` de longitud 0).
  - Cada componente de pantalla acepta el dato real como prop opcional
    (`hasReal ? real! : undefined`); si no llega nada, usa su prop por defecto de la
    demo. Así ningún componente hijo sabe si está en modo real o demo.
  - **Nunca se muestra la demo mientras lo real está cargando**: todas las pantallas
    reales tienen una rama explícita `isAuthenticated && loading` que muestra
    `LoadingRealData` (o un esqueleto a medida) en vez de caer al valor por defecto de
    la demo. Esto se rompió una vez (ver `git log` — "nunca mostrar datos de
    demostración mientras carga una sesión real") y quedó como regla dura desde
    entonces: cualquier hook `useReal*` nuevo debe distinguir "cargando" de "vacío".
  - Las mutaciones (`saveCategoryBudget`, `updateAccountFunction`, `createGoal`,
    `dismissItem`, `createManualAccount`, `addManualTransaction`, etc.) son funciones
    async exportadas junto al hook de lectura del mismo archivo, nunca en el store de
    Zustand de la pantalla (ese store solo guarda estado de interfaz: panel abierto,
    vista Resumen/Detalle, filtros).
  - Botones de "crear" en cabeceras solo se muestran si hay un flujo real detrás: todos
    lo tienen ya — "Nuevo objetivo"/"Registrar aportación" (Objetivos), "Añadir
    posición" (Inversiones), "Simular pago extraordinario" (Deudas), "Añadir cuenta
    manual" (Cuentas) y "Añadir movimiento" (Movimientos/Inicio, solo sobre cuentas
    manuales) son todos reales con sesión.

## Cuentas manuales

Una cuenta sin banco conectado detrás (efectivo, una hucha, un préstamo entre amigos).
No hizo falta ningún cambio de esquema: se cuelga de una conexión especial
(`bank_connections.provider = 'manual'`, una sola por usuario, creada la primera vez que
hace falta) y usa `account_function = 'activo_manual'`, que ya existía. El saldo inicial
se registra como su primer movimiento ("Saldo inicial"); cada movimiento manual
posterior sube o baja `balances.amount_cents` — el saldo de una cuenta manual es siempre
la suma de lo que se ha registrado en ella, nunca un número aparte por sincronizar. Solo
las cuentas manuales aceptan movimientos manuales: una cuenta sincronizada con un banco
siempre refleja lo que dice el banco. Lógica en
`src/features/accounts/useManualEntries.ts`, panel compartido
`src/features/accounts/ManualEntryPanel.tsx` (reutilizado desde Cuentas, Movimientos e
Inicio).

## Categorización y Asistente con IA (Anthropic)

Dos funcionalidades reales llaman a la API de Anthropic desde una Edge Function — nunca
desde el cliente, y la clave (`ANTHROPIC_API_KEY`) vive solo como secreto de Supabase,
configurada directamente por el usuario en su dashboard.

- **`ai-suggest-categories`** (Claude Haiku 4.5): sugiere una categoría — de las que el
  usuario ya tiene, nunca inventa una nueva — para sus movimientos sin clasificar más
  recientes. La respuesta del modelo se filtra defensivamente: cualquier
  `transaction_id`/`category_id` que no exista de verdad se descarta antes de
  mostrarla. La IA sugiere, nunca decide: el Centro de revisión
  (`RealReviewCenter.tsx`) muestra cada sugerencia con la etiqueta "Sugerencia IA" y
  botones Aceptar/Descartar/"Aceptar todas"; nada se aplica solo.
- **`ai-freeform-answer`** (Claude Sonnet 5): responde preguntas libres en Asistente e
  insights. El cliente arma un `FinancialSnapshot` (disponible hoy, patrimonio,
  presupuesto del mes, objetivos, deudas — los mismos datos ya calculados que usan
  Inicio/Presupuesto/Objetivos/Deudas, ver `useRealAnswers.ts`) y se lo pasa entero al
  modelo junto a la pregunta; la función nunca vuelve a calcular nada por su cuenta, así
  no hay dos implementaciones del mismo cálculo que puedan desincronizarse. El prompt
  obliga a responder solo con esos datos y a decir explícitamente "no tengo ese dato en
  Áurea todavía" en vez de inventar una cifra — verificado en vivo con una pregunta que
  no se puede responder con el snapshot (banco con más saldo: lo dice) y una que sí (tasa
  de ahorro: la cita bien). La respuesta se muestra con la etiqueta "Respuesta generada
  por IA a partir de tus datos reales", visualmente distinta de las cuatro preguntas
  fijas (esas son cálculo puro, sin LLM).

Ambas Edge Functions comparten `supabase/functions/_shared/anthropic.ts` (un `fetch` a
`api.anthropic.com`, sin SDK). Sin rate-limiting propio más allá de requerir sesión —
aceptable para un único usuario; a revisar si la app deja de ser de un solo usuario.

## Esquema real (Supabase, proyecto `aurea`)

Migraciones en `supabase/migrations/`, todas con el mismo patrón de seguridad:
`revoke all` + `grant select, insert, update to authenticated` (nunca `delete` — el
borrado siempre es un flag `active`/`archived` reversible), RLS `for all using
(user_id = auth.uid()) with check (user_id = auth.uid())`, FK compuesta `(id, user_id)`
cuando una tabla referencia a otra del mismo usuario, y un bloque `do $$ ... $$` al
final de cada migración que verifica en caliente los privilegios exactos (ni de más ni
de menos) de `authenticated` y `anon`.

Tablas: `bank_connections`, `accounts`, `balances`, `transactions`, `categories`,
`rules`, `budgets`, `goals`, `goal_contributions`, `debt_details`, `investments`,
`recurring_dismissals`, `user_settings`. Edge functions en `supabase/functions/`:
`enable-banking-connect`, `enable-banking-callback`, `enable-banking-save`,
`enable-banking-disconnect`, `ai-suggest-categories`, `ai-freeform-answer`, con lógica
compartida en `_shared/` (`sync.ts` habla con la API de Enable Banking,
`persistence.ts` escribe cuentas/saldos/movimientos, `anthropic.ts` llama a Claude).

## Componentes compartidos

`src/components/`:
- `Card`, `Badge` (variantes `success`/`warning`/`danger`/`pending` con icono automático;
  `info`/`plum`/`neutral` categóricas sin icono — `plum` es también la etiqueta de todo
  lo generado por IA, para distinguirlo de un cálculo real), `ProgressBar` (con
  `markerPercent` opcional), `Money` (formato europeo tabular, `signed`/`tone`),
  `SectionLabel`, `SidePanel` (460 px a la derecha en escritorio, hoja inferior por
  debajo de 1024 px), `UndoBar`, `RingChart` (anillo/donut para progreso — Disponible
  hoy, ritmo de Presupuesto, Objetivos).
- `states/`: `Skeleton`, `EmptyState`, `ErrorState`, `StaleDataNotice`, `SyncingNotice`,
  `NoSearchResults`, `LoadingRealData` (el esqueleto genérico que usan todas las
  pantallas reales mientras cargan) — el catálogo completo, con ejemplos, vive en
  `/estados`.

`src/app/`: `AppShell` (incluye `useIdentity()`), `BottomNav`, `MorePage`.

`src/lib/`:
- `format.ts`: `formatMoney`, `formatMoneySigned`, `formatPercentSigned`,
  `formatDayMonth`, `formatDayMonthYear`, `formatWeekdayDate`, `formatMonthYearLong`,
  `formatIsoDayMonth`, `formatIsoDateTime`. Cada feature con su propia necesidad de
  fechas de proyección tiene su propio `domain.ts` (`goals`, `debts`, `planning`).
- `budgetCalc.ts`: motor puro del ritmo de presupuesto — `computeCategoryPace`,
  `forecastCents`, el ciclo de presupuesto (`cycleStart`/`cycleEnd`/`daysInCycle`/
  `daysElapsedInCycle`, respeta el día de inicio de mes de Ajustes básicos) y `isoDate`
  (fecha local sin desplazarse a UTC, reutilizada por varios módulos reales).
- `categoryColor.ts`: color determinista por nombre de categoría/institución (8
  variantes fijas) para los avatares circulares de Movimientos, Cuentas, Deudas,
  Inversiones y Pagos.

`src/features/accounts/netWorthHistory.ts`: reconstruye el patrimonio neto en fechas
pasadas a partir del patrimonio de hoy y las transacciones desde entonces — nunca
fabrica histórico anterior al primer movimiento sincronizado. Usado por el selector de
periodo (Mes actual/3 meses/Año/Personalizado) de Cuentas y patrimonio e Inicio, que
antes era puramente decorativo (no cambiaba ningún dato).

## Estado y datos

Cada feature tiene su propio store de Zustand en `features/<nombre>/store.ts` para
estado de interfaz — nunca para datos reales, que viven solo en Supabase y se leen vía
los hooks `useReal*`. Los datos ficticios de la demo pública siguen en `src/data/*.ts`,
anclados a `CONTEXT_DATE` (miércoles 19 ago 2026); las cifras cuadran entre pantallas
por diseño, documentado en `docs/DUDAS.md`.

## Decisiones estructurales que persisten

- **Paneles reales, no maquetas**: todo panel que simula o ajusta algo
  (`AdjustBudgetPanel`, `AllocatePanel`, `ExtraPaymentPanel`) recalcula en vivo con la
  fórmula real del dominio.
- **`SidePanel` con foco controlado**: todo panel pasa `onCloseAutoFocus` explícito con
  `event.preventDefault()` + `setTimeout(...)` apuntando a un `id` fijo o a un `useRef`
  capturado antes de que el store lo limpie.
- **Tablas → tarjetas de fila por debajo de 1024 px**: cada tabla del proyecto tiene una
  variante `hidden lg:block` (tabla) y otra `lg:hidden` (tarjetas), con las mismas
  columnas.
- **Reutilización de lógica de dominio entre features**: `features/assistant/answers.ts`
  y `features/assistant/useRealAnswers.ts` reutilizan `goalForecast`
  (`features/goals/domain.ts`) y `simulateExtraPayment` (`features/debts/domain.ts`) en
  vez de reimplementar los cálculos, real o demo; `ai-freeform-answer` reutiliza el
  mismo `FinancialSnapshot` de `useRealAnswers.ts` en vez de recalcular nada en Deno.
- **Conexiones bancarias como fuente única de verdad para avisos de estado** en modo
  demo: el aviso de datos desactualizados de Inversiones (MyInvestor) y el de
  sincronización de Cuentas (Revolut) leen el mismo `connections` de `data/settings.ts`
  que usa Ajustes. En modo real, el equivalente es `useRealConnections` +
  `bank_connections` (tarjeta "Tu conexión bancaria real" en Ajustes).
- **No fabricar, nunca**: ni datos falsos donde debería haber reales (siempre `real ??
  undefined`, nunca un valor por defecto que parezca real), ni una fabricación
  *temporal* mientras algo carga (de ahí el patrón `isAuthenticated && loading` en cada
  pantalla), ni una alucinación de un modelo de IA presentada como hecho (de ahí que
  ambas Edge Functions de IA filtren/adviertan en vez de fiarse a ciegas). Se aplica
  también a identidad de usuario, hora de sincronización y cualquier ajuste guardado —
  todo lo que se muestra con sesión real, sale de Supabase, sale de un modelo con datos
  reales y etiquetado como tal, o se oculta.

## Fuera de alcance explícito

- **Moneda y formato de fecha** (Ajustes básicos): se guardan de verdad en
  `user_settings`, pero no cambian el comportamiento de ninguna pantalla. Conectar
  moneda exigiría un tipo de cambio real (las cuentas están en EUR); conectar el
  formato de fecha exigiría cambiar el estilo de fecha ("19 ago 2026") de toda la app,
  ya que ninguna de las tres opciones (`DD/MM/AAAA`, `MM/DD/AAAA`, `AAAA-MM-DD`)
  coincide con el estilo actual — decisión explícita, no pendiente por olvido.
- **Importación CSV** (Ajustes): sigue siendo enteramente de demostración, marcada con
  el badge "Demostración" tanto con sesión real como sin ella — no hay parseo real de
  archivo ni persistencia.
- **Compartir cuenta con otra persona**: valorado y aplazado a propósito — cambiaría el
  modelo de RLS de todas las tablas (`user_id = auth.uid()` pasaría a algo como "user_id
  en el grupo compartido"), no es un añadido pequeño. Hoy Áurea es de un solo usuario
  por sesión; la única noción de "compartido" es el % de titularidad de una cuenta
  conjunta (`accounts.share_percent`), que ya existía.
- **División de un movimiento en varias categorías**: no se persiste, real ni demo.
- **Detección automática de transferencias internas**: no implementada.
- **Arrastre táctil para cerrar hojas inferiores**: las hojas inferiores cierran con ✕,
  `Esc` y clic fuera; el gesto de arrastre no está implementado (ver `docs/DUDAS.md`,
  corte 12).

## Verificación

Cada cambio (de la demo original, la fase de datos reales y la fase de IA) cierra con
`npx tsc -b --noEmit`, `npm run lint` (oxlint), `npm run test` (vitest) y `npm run build`
en limpio, más una comprobación visual en navegador — en real, siempre contra una sesión
autenticada de verdad (Claude in Chrome), nunca solo capturas de la demo; las funciones
de IA se verifican con una llamada real a Anthropic, nunca simulada. Despliegue
automático en Vercel al hacer push a `main`; las Edge Functions se despliegan aparte,
directamente contra el proyecto de Supabase.
