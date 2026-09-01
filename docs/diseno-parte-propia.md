# Diseño — "de este cargo, esta parte es mía"

Estado: propuesta, sin implementar. 1 sep 2026.

## El problema

Áurea sabe cuánto salió de tu cuenta. No sabe cuánto de eso era **tu gasto**.
Son cosas distintas cada vez que pagas algo que compartes: una cena que
adelantas, un alquiler que va a medias, una suscripción entre varios.

Hoy la app cuenta el cargo entero como gasto tuyo. Eso infla las categorías,
el presupuesto, la previsión de cierre y la tasa de ahorro, y no hay forma de
corregirlo salvo mintiendo en otro sitio.

## Lo que NO se va a hacer

**No se va a deducir el reparto a partir de los movimientos.** Se estudiaron
dos modelos que lo intentan y los dos fallan:

- **Un porcentaje fijo por cuenta** (`accounts.share_percent`, que ya existe
  para el patrimonio). Describe una cuenta, pero lo que se reparte es un
  *coste*. Se aplicaría a todo lo que pase por esa cuenta tenga que ver o no.
  Y cuando la aportación es un importe fijo y el recibo varía, el porcentaje
  deriva solo.
- **La ratio "mi aportación / aportaciones totales del ciclo"**. Medido contra
  datos reales de cuatro ciclos, da 100 %, 50 %, 75 % y 67 % para un reparto
  que en realidad es constante. Falla por dos motivos estructurales: no
  distingue el dinero propio del que uno adelanta por otro (mismo emisor,
  misma cuenta, mismo signo), y las aportaciones no respetan los límites de
  ciclo.

El reparto es un acuerdo entre personas. No está en el dato bancario, y
ninguna heurística lo va a sacar de ahí. **El usuario lo declara; la app lo
recuerda y lo repite.** Recordar no es adivinar.

## La primitiva

Sobre un movimiento, el usuario declara: **de este cargo, X € son míos.**

Todo lo demás del movimiento sigue intacto — importe, comercio, fecha, cuenta.
Lo único que cambia es cuánto suma a gasto: `X` en vez de `|importe|`.

No hay concepto de "alquiler", "cuenta conjunta" ni "compañero de piso" en
ningún sitio. La app no sabe *por qué* solo esa parte es tuya.

## Implementación

La primera versión de este documento proponía reutilizar `transaction_splits`
añadiéndole un tipo de trozo `not_mine`. Al leer el esquema real de la tabla
(ver `create_transaction_splits` y `docs/notas-esquema.md`) esa vía sale más
cara de lo que parecía:

- `category_id` es **NOT NULL**. Un trozo "no es mío" no tiene categoría, así
  que habría que quitarle el NOT NULL a una columna que hoy lo tiene, o
  inventar una categoría centinela que ensuciaría todos los listados.
- No hay política de UPDATE: las divisiones son borrar-y-reinsertar. No es un
  problema, pero confirma que la tabla está pensada para un único uso.

El invariante de la suma lo impone además un CONSTRAINT TRIGGER diferido,
`transaction_splits_sum_check`. Una versión anterior de este documento decía
que habría que modificarlo: **es falso**. Suma `amount_cents` sin mirar de qué
tipo es el trozo, así que `[Hogar −798] + [no es mío −1.647] = −2.445` le
cuadra sin tocarlo.

### Opción A — columna en `transactions` (recomendada)

```
transactions.not_mine_cents integer not null default 0
  check (not_mine_cents >= 0 and not_mine_cents <= abs(amount_cents))
```

El gasto pasa a ser `|amount_cents| - not_mine_cents`. No toca la tabla de
divisiones, no toca el trigger desconocido, no necesita FK nueva. La vista
`transaction_category_amounts` gana una columna y la regla única de
`reimbursements.ts` la aplica en un solo sitio.

**Lo que no resuelve:** un movimiento que esté a la vez dividido entre
categorías y compartido. Hay que decidir si `not_mine_cents` se reparte
proporcionalmente entre los trozos o si la combinación se prohíbe de entrada.
Recomendación: prohibirla en la v1 y ver si alguien la pide — repartir un
"no es mío" entre categorías es una respuesta inventada a una pregunta que el
usuario no ha hecho.

### Opción B — trozo `not_mine` en `transaction_splits`

Más elegante conceptualmente: un solo mecanismo, la suma cuadra por
construcción y con el trigger existente, y compone con las divisiones por
categoría sin ambigüedad. Exige quitar el NOT NULL de `category_id`, añadir
`kind` y ampliar `replace_transaction_splits`.

La diferencia entre A y B es más estrecha de lo que parecía al descartar B por
el trigger. Lo que decide es esto: **B debilita una garantía que hoy existe**.
Quitar el NOT NULL de `category_id` lo quita para *todos* los trozos, también
los normales, y entonces hace falta un check condicional
(`kind = 'category'` implica categoría no nula) para recuperar lo que ya se
tenía gratis. A no quita nada; solo añade una columna con su propio check.

B merece la pena si "dividido entre categorías **y** compartido" resulta ser un
caso real. Hoy no hay ninguno en los datos.

## Requisito 1 — marcarlo una vez

Las reglas ya existen (`rules`), ya se aplican a los movimientos existentes
por `ilike` (`useRealTransactions.ts:356`) y ya se reaplican a cada movimiento
nuevo en la sincronización (`_shared/persistence.ts:28`). Hoy solo asignan
categoría.

La regla gana un reparto, en **uno de dos modos**:

| Modo | Guarda | Estable cuando |
|---|---|---|
| Importe fijo | `mine_cents` | el cargo varía y tu parte no (alquiler, hipoteca) |
| Proporción | `mine_permille` | el cargo varía y tu parte es una fracción (cena a escote) |

Los dos modos son necesarios, y lo impone el requisito 2. Para un alquiler de
2.445 € donde pones 798 €, un porcentaje deriva en cuanto el recibo cambia.
Para una cena, un importe fijo no significa nada. Exactamente uno de los dos
por regla.

## Requisito 2 — cena entre amigos e hipoteca a medias

La primitiva es la misma para los dos: un trozo `not_mine`. Lo que **no** es
igual es el automatismo, y conviene decirlo claro:

- **Hipoteca / alquiler / suscripción compartida**: mismo concepto cada mes,
  descripción estable. La regla dispara sola. Requisito 1 cumplido.
- **Cena entre amigos**: restaurante distinto cada vez. **No hay clave estable
  con la que casar una regla.** El requisito 1 NO se cumple aquí, y no se
  puede cumplir sin que la app adivine.

Lo honesto es no fingir que sí. Para ese caso lo que se puede dar es un camino
manual rápido (marcar el reparto en dos toques desde el propio movimiento, con
el último reparto usado como valor por defecto), no una regla automática.

## Interacción peligrosa con `is_reimbursement`

**Los dos mecanismos no se pueden usar sobre el mismo gasto.** Hoy:

- Cargo de 60 €, un amigo te devuelve 40 € marcados como reembolso → el gasto
  queda en 20 €. Correcto, pero solo *después* de que te devuelvan; hasta
  entonces parece que gastaste 60 €.

Con la parte propia:

- Cargo de 60 € con 20 € míos → el gasto es 20 € desde el minuto uno. Si
  además marcas los 40 € que llegan como reembolso, el gasto baja a **−20 €**.

Restarían dos veces. La implementación tiene que **impedirlo**, no
documentarlo: si un movimiento tiene un trozo `not_mine`, el abono asociado no
puede ser un reembolso — tiene que ser neutro.

Esto es lo primero que hay que resolver, porque es un error silencioso que
además empeora justo la cifra que este trabajo quiere arreglar.

## Qué NO cubre esta propuesta

La parte que más importa.

1. **La cena entre amigos no se automatiza.** Sin clave estable no hay regla.
   Se queda en marcado manual rápido. Medio requisito 2 sin cumplir.

2. **Devoluciones envueltas.** Un ingreso de 1.500 € que mezcla el adelanto
   del alquiler con la devolución de un préstamo no lo desenreda esto ni nada
   parecido. Repartir un *ingreso* entre varias deudas es conciliación, otra
   función distinta. Caso real y sin solución aquí.

3. **No dice que te deben dinero.** El trozo `not_mine` desaparece del gasto y
   no aparece en ningún sitio como activo. Si adelantaste ese dinero, tu
   patrimonio lo infravalora hasta que vuelve. `receivables` existe pero no
   está enlazado. Es la capa 2, y no está en esta propuesta.

4. **Un reparto no tiene vigencia.** La regla guarda un valor. Si tu parte
   cambia (se va un compañero), o reescribes el pasado o creas una segunda
   regla con fecha. Mismo problema de retroactividad que `share_percent`, sin
   resolver.

5. **No sabe quién te debe qué.** Solo distingue "mío" de "no mío". Un reparto
   entre tres personas con importes distintos no queda registrado como tal.

6. **Divisas.** Un `mine_cents` fijo en una cuenta en libras son céntimos de
   libra. El reparto entre divisas queda indefinido.

7. **La declaración no se comprueba.** Si dices 798 € y en realidad pusiste
   850 €, nada lo detecta. Es una declaración del usuario y la interfaz debe
   presentarla como tal, nunca como un hecho verificado.

8. **No arregla "Otros".** El 91 % de esa categoría son traspasos a cuentas
   propias y devoluciones de préstamo. Eso necesita `is_internal_transfer` y
   un concepto de deuda, no "mi parte". Siguen siendo dos arreglos aparte.

## Orden propuesto

0. Terminar la reconciliación de migraciones (los 18 ficheros que faltan en el
   repositorio, entre ellos `create_transaction_splits` y su trigger). Sin eso,
   cualquier migración nueva se apila sobre una historia incompleta.
1. La primitiva (`not_mine_cents`, opción A) + la vista + los 8 puntos de
   agregado que aplican la regla de gasto.
2. El bloqueo de `is_reimbursement` sobre movimientos con parte propia — antes
   que las reglas, porque es un error silencioso que resta dos veces.
3. Las reglas con reparto (importe fijo o proporción).
4. Que al declarar "esta parte no es mía" se pueda decir si vuelve o no, y que
   lo que vuelve quede como cobro pendiente. **Ya no es capa 2 opcional**: con
   datos reales el usuario ha llegado a tener 3.915 € fuera y dos meses
   seguidos por encima de 2.600 €, invisibles en el patrimonio. Sigue siendo
   una declaración del usuario: la app no da por hecho que el dinero vuelve.
