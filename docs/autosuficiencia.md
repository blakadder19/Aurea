# Qué te obliga a salir de Áurea

17 sep 2026. Objetivo declarado: **todo lo financiero desde Áurea, sin
depender de nada de fuera.** Este documento mide la distancia hasta ahí,
leyendo el modelo de datos — no las pantallas.

Método: en vez de preguntar "¿qué módulos hay?" (que mide superficie),
pregunta "¿qué concepto financiero no existe en el esquema?". Si un concepto
no está modelado, la actividad que lo necesita se hace fuera, por definición.

## El techo que no se mueve con código

Áurea conecta por **Enable Banking AIS, de solo lectura**
(`init_real_banking.sql:1`). Puede ver cuentas y movimientos; **no puede
mover dinero**. Pagar, transferir y domiciliar quedan fuera mientras no se
añada PIS, que es otra licencia y otro producto.

Conviene decirlo en voz alta al fijar el objetivo: la meta alcanzable es
*saberlo y decidirlo todo* desde Áurea, no *ejecutarlo* todo. Todo lo demás de
este documento sí depende de nosotros.

## 1. Divisas — el bloqueo estructural

**No existe ninguna tabla de tipos de cambio.** `currency` se guarda en
`accounts`, `transactions`, `balances` y `balance_snapshots`, pero no hay
dónde poner una tasa.

Consecuencia directa: con cuentas en EUR, GBP, PLN y SEK, hoy la app **suma
divisas sin convertir** (~1.200 zł contados como 1.200 €, ver
`docs/divisas.md`). Y no es que esté mal implementado: **el modelo no admite
la respuesta correcta**. Para saber cuánto gastaste de verdad hay que salir a
mirar una tasa.

Es el primer bloqueo real del objetivo, y arreglar las comparaciones y las
sumas no lo resuelve: hace falta el concepto.

## 2. Personas — el dinero compartido vive en tu cabeza

No hay entidad de contraparte. `receivables` es `(name, amount_cents,
settled)`: un nombre en texto libre, **sin enlace a ningún movimiento, sin
fecha de vencimiento, sin liquidación parcial**. Es una nota adhesiva.

Contra el caso real: el alquiler a tres (798/798/850), el adelanto mensual que
vuelve, el préstamo de 3.015 € devuelto a plazos y envuelto con otros cobros.
Nada de eso existe en el modelo. El seguimiento lo haces tú, de memoria — que
es la dependencia externa más difícil de ver porque no tiene icono.

`docs/diseno-parte-propia.md` resuelve la mitad del gasto. La otra mitad
—quién te debe qué y desde cuándo— sigue sin concepto.

## 3. Cifras que se teclean y envejecen

Dos módulos enteros funcionan a mano, y por eso mandan fuera a comprobar:

- **Inversiones.** `investments` guarda `units`, `avg_cost_cents`,
  `value_cents` y `contributed_cents`. **No hay ISIN, ni ticker, ni fuente de
  precio.** El valor de la cartera es un número que escribiste tú y que
  caduca solo. No es casualidad que `StaleDataNotice` solo se use en este
  módulo: es el único que sabe que miente con el tiempo. Para saber cuánto
  vale tu cartera, abres el bróker.
- **Objetivos.** `goals.saved_cents` es un número suelto, **sin enlace a
  ninguna cuenta**. El progreso no se deriva de tu ahorro real: lo actualizas
  a mano. Teniendo cuentas con `account_function = 'ahorro'` y
  `balance_snapshots`, el dato para derivarlo ya está.

## 4. Impuestos — el agujero más grande

No hay nada. Ni ejercicio fiscal, ni retenciones, ni deducciones, ni facturas,
ni IVA, ni trimestres.

Y el esquema ya sabe que hace falta: `declared_incomes.income_type` admite
`'autonomo'` y `'alquiler'`. Áurea reconoce que tienes ingresos de autónomo y
de alquiler, y no tiene una sola columna sobre lo que eso implica en
impuestos. Toda esa parte de tus finanzas ocurre íntegramente fuera.

Es también la más cara y la más dependiente de jurisdicción, así que "el
agujero más grande" no significa "lo siguiente que hacer".

## 5. Documentos

`transactions.receipt_path`: un recibo por movimiento, y ya. No hay contratos,
ni facturas, ni nóminas, ni justificantes que no cuelguen de un movimiento
concreto. Cualquier papel financiero que no sea un recibo de compra vive en
otra carpeta.

## 6. Huecos menores, ya modelables

- **No se puede presupuestar el ingreso.** `budgets` va por categoría y las
  categorías de ingreso se excluyen a propósito del presupuesto de gasto. No
  hay "espero ingresar X este mes".
- **Sin historial de cumplimiento.** `budgets` tiene columna `month`, así que
  el histórico existe en la base; no hay ninguna vista que lo lea.
- **Las etiquetas no se pueden filtrar** (`FilterBar` no las conoce), así que
  cualquier clasificación propia que montes acaba en una hoja aparte.
- **`sync_runs` invisible**: no puedes saber si una sincronización falló.

## Lectura

Ordenados por cuánto acercan al objetivo frente a lo que cuestan:

1. **Divisas** — bloquea la corrección de casi todo lo demás y ya te está
   dando cifras falsas. Necesita concepto nuevo (tasas), no un parche.
2. **Personas y dinero compartido** — el caso real más frecuente y el que hoy
   sostienes tú de memoria. Diseño ya medio hecho.
3. **Derivar Objetivos del ahorro real** — barato, el dato ya está.
4. **Precio de inversiones** — necesita fuente externa de datos; decisión
   aparte.
5. **Impuestos** — el hueco mayor y el más caro. No es lo siguiente.

Los huecos del punto 6 son baratos y no dependen de que las cifras estén bien,
así que pueden ir en paralelo a cualquier cosa.
