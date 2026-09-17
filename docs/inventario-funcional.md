# Inventario funcional — qué hay y dónde se queda corta

17 sep 2026. Leído del código, no de suposiciones. Punto de partida para
decidir qué añadir, no una lista de tareas aprobada.

## Lo primero: la app no es pequeña

Trece módulos con contenido real:

| Módulo | Qué compone hoy |
|---|---|
| Inicio | Disponible hoy, patrimonio, ritmo de presupuesto, próximos pagos, bandeja de atención, insight explicable, últimos movimientos |
| Movimientos | Tabla, filtros, búsqueda, panel de detalle, acciones en lote, centro de revisión |
| Presupuesto | Categorías, veredicto del mes, ajuste, propuesta según gasto real, tarjetas de no-gasto |
| Cuentas | Tabla, KPIs de patrimonio, gráfico de evolución, desgloses, detalle por cuenta, entradas manuales |
| Informes | Gasto por categoría, por comercio, evolución mensual, evolución por categoría, comparativa mes anterior y año anterior |
| Planificación | Proyección, independencia financiera, constructor de escenarios, escenarios guardados |
| Objetivos | Tarjetas, fondo de emergencia, asignación |
| Deudas | Tabla, comparación de estrategias, pago extra, detalle |
| Inversiones | Resumen de cartera, posiciones, asignación, desglose por tipo |
| Pagos | Lista, calendario, detalle de suscripción, alta manual |
| Ingresos | Declarados, por tipo, cobros pendientes |
| Asistente | Preguntas sugeridas, pregunta libre, tarjetas de respuesta |
| Ajustes | Conexiones, reglas, importar CSV, exportar, básicos |

**Si se siente simple, no es por falta de módulos.** Un decimocuarto no lo
arregla. Lo que sigue busca dónde está realmente la carencia.

## 1. Datos que ya se recogen y no se enseñan

Lo más barato que hay: no requiere modelo nuevo ni sincronizar nada.

- **`sync_runs` entera.** La Edge Function escribe una fila por
  sincronización con `started_at`, `finished_at`, `status`, `accounts_count`,
  `transactions_new`, `error_code` y `window_from`
  (`_shared/persistence.ts:185`). **La app no lee esa tabla ni una vez.** Hay
  un historial completo de sincronizaciones —incluidos los fallos— invisible.
  Hoy solo se ve `last_synced_at`, un timestamp suelto.
- **`accounts.iban_masked`.** Nunca se usa. Con ironía: el 31 de agosto se
  resolvió el problema de "cuentas que se llaman igual" añadiendo la divisa a
  la etiqueta, cuando el IBAN enmascarado llevaba ahí desde la primera
  migración. La divisa sigue siendo buena solución, pero conviene saber que
  había otra.
- **`rules.applied_count`.** Se incrementa y no se muestra. La pantalla de
  reglas no puede decir "esta regla ha clasificado 47 movimientos", que es
  justo lo que hace falta para decidir si una regla sobra.
- **`balances.reference_date` y `captured_at`.** No se usan, así que ningún
  saldo puede decir a qué fecha está referido ni cuándo se capturó.
- **`transactions.tags`.** Se pueden guardar desde el panel de detalle pero
  **no se pueden filtrar**: `FilterBar` no las conoce. Etiquetar sin poder
  buscar por etiqueta no sirve de nada.

## 2. Asimetrías: lo que un módulo hace y los demás no

Aquí está, creo, la mayor parte del "se queda corta". No falta capacidad:
falta que esté repartida.

| Capacidad | Dónde está | Dónde falta |
|---|---|---|
| **Cambiar de periodo** | Presupuesto, Informes | Los otros 11. Inicio, Cuentas, Pagos, Objetivos, Deudas, Ingresos solo saben del ahora |
| **Gráfico** | Inicio (patrimonio), Cuentas, Informes, Planificación, Inversiones | **Presupuesto no tiene ninguno**, siendo el módulo central. Tampoco Movimientos, Pagos, Objetivos, Deudas, Ingresos |
| **Comparar con el periodo anterior** | Informes, Presupuesto, Cuentas (KPIs), Objetivos, detalle de suscripción | Movimientos, Ingresos, Deudas, Inversiones |
| **Aviso de datos viejos** | Solo Inversiones (`StaleDataNotice`) | Todos los demás, incluidos Cuentas y Movimientos, que es donde más importa |
| **Buscar y filtrar** | Solo Movimientos | Ninguna otra lista es filtrable |
| **Deshacer** | 7 módulos (`UndoBar`) | Cuentas, Deudas, Planificación, Informes |

## 3. Lo que no existe

- **Historial de cumplimiento del presupuesto.** Se puede ver el mes actual y
  navegar hacia atrás de uno en uno, pero no hay ninguna vista de "cumpliste
  6 de los últimos 9 meses". El dato está; la lectura no.
- **Detalle por comercio.** Informes lista los 10 primeros, pero no se puede
  entrar en uno y ver su historia, su cadencia, su evolución de precio.
  Pagos ya calcula eso para las suscripciones — solo está atado a ese módulo.
- **Búsqueda por nota o etiqueta.** Ver arriba.
- **Nada que mire hacia adelante salvo Planificación**, que es un simulador de
  escenarios a años vista. No hay "cómo va a acabar este mes" fuera de la
  previsión de cierre del presupuesto.

## 4. El orden importa

En sesiones anteriores quedó documentado que las cifras están mal por tres
vías: divisas sin convertir (`docs/divisas.md`), traspasos a cuentas propias
sin marcar, y gasto compartido contado entero
(`docs/diseno-parte-propia.md`).

Casi todo lo del apartado 2 consiste en **enseñar las mismas cifras en más
sitios**. Un gráfico de evolución del presupuesto sobre un gasto inflado en
~900 € por el viaje a Polonia es una superficie más que miente, y más
convincente que una tabla porque una línea se lee como un hecho.

No es un argumento para no hacerlo. Es un argumento para hacer primero lo del
apartado 1 —que no depende de esas cifras— mientras se cierran los arreglos
pendientes, y dejar los gráficos y las comparativas para cuando los números
aguanten que los miren de cerca.

## Pendiente de decidir

Nada de esto está priorizado todavía. Falta:

- Ver la app (capturas), para la dimensión de acabado visual, que desde el
  código no se juzga.
- Un export nuevo: el de `tmp/` es del 31 de agosto y la ventana de ciclos ya
  se ha movido.
- Saber qué sigues haciendo fuera de Áurea, que es la única fuente fiable
  para el apartado 3.
