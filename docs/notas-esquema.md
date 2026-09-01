# Notas del esquema — lo que el SQL no dice

Cosas que se descubrieron leyendo la base tabla por tabla el 1 de septiembre
de 2026, y que **no se deducen del volcado de migraciones**. Sin esto, la
siguiente persona que lea el esquema sacará conclusiones equivocadas o
"arreglará" cosas que están bien a propósito.

Contexto: durante un tiempo el repositorio se quedó sin 18 de las migraciones
que sí estaban aplicadas en el servidor. Al reconciliarlo se recuperó el SQL
literal, pero el SQL no explica nada de lo de abajo.

## Dos invariantes de `transaction_splits` que no coinciden entre sí

La suma de las divisiones de un movimiento debe cuadrar con su importe. Eso lo
imponen **dos** sitios, y no con la misma regla:

| Dónde | Condición |
|---|---|
| `replace_transaction_splits` (la RPC) | `if v_count > 0 and v_sum <> v_tx_amount` |
| `check_transaction_splits_sum` (constraint trigger) | `if v_splits_sum <> 0 and v_splits_sum <> v_tx_amount` |

La guarda del trigger existe para permitir borrar todas las divisiones (cero
filas suman cero). Pero al mirar la **suma** en vez del **número de filas**,
deja pasar un conjunto de divisiones que sume exactamente cero sobre un
movimiento que no vale cero: partir un cargo de −2.445 € en `[−800]` y `[+800]`
pasa la comprobación.

La RPC no cae en eso, así que por la vía normal no se puede provocar. **El
trigger es la puerta de atrás**: cualquier inserción que no pase por la RPC se
salta la comprobación real. Si algún día se escribe en `transaction_splits`
directamente, esto importa.

## `integer` leyendo un `bigint`

`transactions.amount_cents` es **bigint**. Pero `transaction_splits.amount_cents`
es **integer**, y las dos rutinas que comparan los dos declaran su variable
como integer:

- `replace_transaction_splits`: `v_tx_amount integer`
- `check_transaction_splits_sum`: `v_tx_amount integer`

Un movimiento por encima de ~21,4 M € (2³¹ céntimos) no se puede dividir: el
`select amount_cents into v_tx_amount` revienta. Teórico hoy, real en el
esquema, y no se arregla cambiando solo la columna — hay que tocar las dos
funciones a la vez.

## `manual_recurring_items.frequency` es texto libre a propósito

No tiene CHECK, y **no debe tenerlo**. No es un enum: es una etiqueta que se
pinta tal cual, con valores como `"Cuota 3 de 4 · sin intereses"` junto a los
`"Mensual"` de siempre (ver `src/data/recurring.ts`). Añadirle una lista
cerrada rompería datos legítimos.

## Las asimetrías de permisos son deliberadas

Las tres tablas tienen juegos de políticas distintos, y cada hueco tiene un
motivo. Contrastados contra el código que las usa: los tres encajan, no hay
ningún bug latente.

| Tabla | Políticas | Por qué falta la otra |
|---|---|---|
| `transaction_splits` | select, insert, **delete** | Sin update: `replace_transaction_splits` borra y reinserta, y como es SECURITY INVOKER necesita el DELETE del propio usuario. |
| `manual_recurring_items` | select, insert, **update** | Sin delete: borrar un recurrente es `active = false` (`deactivateManualRecurringItem`), con su deshacer. Es el principio de "los borrados se modelan como cambios de estado". |
| `planning_scenarios` | select, insert, **delete** | Sin update: un escenario es un borrador que se tira, no un hecho financiero. Editar = borrar y volver a guardar. Nació sin delete; se añadió después en `grant_delete_planning_scenarios`. |

Si alguien añade la política que "falta" en cualquiera de las tres, está
cambiando el modelo, no completando un descuido.

### El "nunca DELETE" ya no es la regla

`init_real_banking` declara como principio *"Nunca DELETE: los borrados se
modelan como cambios de estado"*. **Eso dejó de ser cierto y el comentario
sigue ahí.** Hoy hay DELETE concedido en siete tablas: `accounts`, `balances`,
`transactions`, `categories`, `rules`, `planning_scenarios` y
`transaction_splits`.

No es una erosión accidental — cada una se añadió con su motivo, y
`delete_manual_accounts_transactions_balances` es el caso más cuidado: en vez
de conceder DELETE a secas, sustituye la policy `own_*` (que era FOR ALL) por
policies explícitas por comando, y la de DELETE exige además que la fila
cuelgue de una conexión con `provider = 'manual'`. Los datos sincronizados de
un banco real siguen sin poderse borrar.

La regla real, entonces, es: *un hecho financiero sincronizado no se borra
nunca; lo que el usuario creó, sí*. Merece la pena corregir el comentario de
`init_real_banking` para que no siga afirmando algo que el esquema contradice
en siete sitios.

## `force row level security`

Tres tablas nacieron sin él (`transaction_splits`, `manual_recurring_items`,
`planning_scenarios`) simplemente porque no se escribió en sus migraciones.

Importa saber qué era y qué no era: **no había fuga de datos entre usuarios**.
`authenticated` y `anon` ya estaban sujetos a RLS por no ser dueños de la tabla
ni tener BYPASSRLS. `force` solo extiende la RLS al rol **dueño**, y los roles
que de verdad se la saltan (`postgres`, `service_role`) lo hacen por atributo,
con force o sin él.

Lo que se ganó al alinearlas fue poder afirmar la regla entera: *todas* las
tablas de `public` tienen RLS activada y forzada. "18 de 21" no es una regla
que nadie pueda comprobar. La migración que lo alinea deja una comprobación
global para que la próxima tabla que nazca sin ello rompa el despliegue.

## Otro hueco, sin resolver

`exportAllDataJson` (`src/features/settings/exportData.ts`) promete "una copia
completa de tus datos… exactamente lo que hay guardado" y **no incluye**
`transaction_splits`, `rules`, `receivables`, `user_settings`,
`balance_snapshots` ni `declared_incomes`. Quien restaure desde ese fichero
pierde sus divisiones y sus reglas sin enterarse.
