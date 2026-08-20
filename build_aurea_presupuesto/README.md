# Build: Áurea — corte 3, pantalla Presupuesto

Paquete para ejecutar en **`blakadder19/Aurea`** (rama `main`) con Claude Code, **encima de los cortes 1 y 2**
(andamiaje + tokens + shell + Inicio + Movimientos, ya cerrados y verificados).

## Alcance de este corte

1. Ruta `/presupuesto` dentro del shell existente.
2. **Bloque de conclusión del mes**: titular-conclusión, barra de ritmo con marca de ritmo esperado y cinco KPIs.
3. **Gasto de consumo por categoría**: ocho categorías con barra, estado y explicación en modo Detalle.
4. **Tres bolsas que no son consumo**: ahorro, inversión y transferencias entre cuentas propias.
5. Conmutador **Resumen / Detalle** (mismo patrón que Inicio).

Nada más. `Ajustar presupuesto` puede ser un botón que abra un panel con los importes por categoría
editables en local (sin persistencia) o quedar deshabilitado con texto `Próximamente` — decide una
y sé consistente; nunca un botón que no haga nada sin decirlo.

## Stack y reglas

Mismos que los cortes anteriores. `tokens.css` es idéntico: si ya está en `src/index.css`, no lo cambies.
Se mantienen todas las reglas no negociables: cuerpo ≥16 px, etiquetas ≥13 px, áreas ≥44 px, foco visible,
estado = color + icono + palabra, formato europeo tabular, títulos que dicen la conclusión, superficies
blancas, verde solo para acción y positivo, sin degradados ni gamificación ni tono moralizante.

## Estructura propuesta (añadidos)

```
src/
  features/budget/
    BudgetPage.tsx          ← cabecera + conmutador Resumen/Detalle
    MonthVerdictCard.tsx    ← titular + barra de ritmo + 5 KPIs
    PaceBar.tsx             ← barra 18 px + marca negra de ritmo esperado
    CategoryList.tsx        ← lista de categorías
    CategoryRow.tsx         ← nombre, cifras, chip de estado, barra, detalle
    NonSpendCards.tsx       ← ahorro / inversión / transferencias
    AdjustBudgetPanel.tsx   ← opcional, usa SidePanel del corte 1
  data/budget.ts
```
Reutiliza `Card`, `Badge`, `Money`, `SectionLabel`, `SidePanel`, `lib/format.ts`, y **la misma `PaceBar`
que usa `BudgetPaceCard` en Inicio** — extráela a `components/` si hace falta, no la dupliques.

## Especificación

Referencia visual exacta: `Áurea - Presupuesto.dc.html` en este paquete (abre en el navegador).

### Cabecera
Título `Presupuesto` en serif 32 px + subtítulo `agosto de 2026 · día 19 de 31`.
A la derecha, acción `Ajustar presupuesto`. Segunda fila: etiqueta `VISTA` + conmutador
`Resumen` / `Detalle` (estado de Zustand, no ruta).

### Bloque 1 — Conclusión del mes
Tarjeta blanca radio 20. Titular serif 26 «Vas 145 € por encima del ritmo previsto» + chip ámbar
`▲ Por encima` alineado arriba a la derecha.
Barra de 18 px: fondo `--color-green-soft`, relleno verde al 67 %, **marca vertical negra de 3 px al 61 %**
que sobresale 6 px por arriba y por abajo. Debajo, leyenda a los extremos: `Ritmo real 67 %` /
`Ritmo esperado 61 %` (14 px, tabular).
Pie separado por filete: cinco KPIs en rejilla de 5 columnas, etiqueta 14 px + cifra 24/700 tabular —
Presupuestado `2.400 €`, Gastado `1.612 €`, Comprometido `288 €`, Restante `500 €`,
Previsión de cierre `2.545 €` (en ámbar, porque supera lo presupuestado).

### Bloque 2 — Gasto de consumo por categoría
Tarjeta blanca radio 20, titular serif 22 «Gasto de consumo por categoría».
Una fila por categoría: nombre 17/600 a la izquierda; a la derecha `gastado de presupuestado` (16 px,
tabular) + chip de estado. Debajo, barra de 12 px sobre `--color-green-soft`.
Colores de estado: `Al día` verde, `Por encima` ámbar, `Agotado` rojo — siempre con la palabra, nunca
solo el color. Una categoría gastada por encima del 100 % llena la barra al 100 % (no desborda) y
se marca `Agotado`.
En modo **Detalle**, cada fila añade una línea de 15 px explicando el porqué (ritmo esperado frente a
real, o de dónde viene el gasto). El modo Detalle no añade bloques nuevos ni reordena nada.

### Bloque 3 — Lo que no es consumo
Rejilla de tres tarjetas de color suave, cada una con etiqueta en versalitas, cifra serif 28 tabular y
una línea de contexto:
- Ahorro este mes `350 €` — «Aparte del gasto de consumo» (azul `#EAF3F7` / borde `#C9DEE7` / texto `#2E6E8E`).
- Inversión este mes `300 €` — «Aportación automática» (lila `#F1EEF7` / `#DCD3EA` / `#6B5B95`).
- Transferencias este mes `80 €` — «Entre tus propias cuentas» (neutro `#F6F8F7` / `#E2E7E4` / `#5A6360`).

Estos tres importes **no** entran en el gasto de consumo: es la razón de que existan como bloque aparte.

## Datos ficticios (usar tal cual; cuadran con los cortes 1 y 2)

Contexto: **Marta Ríos**, agosto de 2026, día 19 de 31.
Total: 2.400 € presupuestado · 1.612 € gastado · 288 € comprometido · 500 € restante ·
previsión de cierre 2.545 € (+145 €). Ritmo real 67 %, ritmo esperado 61 %.

| Categoría | Presupuestado | Gastado | Estado |
|---|---|---|---|
| Supermercado | 480 € | 312 € | Al día |
| Restaurantes | 400 € | 312 € | Por encima |
| Hogar y facturas | 620 € | 404 € | Al día |
| Transporte | 160 € | 96 € | Por encima |
| Ocio y suscripciones | 240 € | 148 € | Al día |
| Ropa y cuidado | 200 € | 84 € | Al día |
| Salud | 120 € | 38 € | Al día |
| Otros | 180 € | 218 € | Agotado |

(La referencia visual muestra solo seis filas por espacio; en la implementación van las **ocho**.)

Explicaciones de Detalle: Supermercado «Ritmo esperado al día 19: 62 %. Vas alineada.» ·
Restaurantes «Ritmo esperado 62 %, vas al 78 %. Sobre todo cenas de fin de semana.» ·
Hogar y facturas «Incluye luz, internet y seguro del hogar de esta semana.» ·
Transporte «Más viajes en Renfe que el mes anterior.» · Ocio y suscripciones «Netflix, Spotify,
Filmin y gimnasio.» · Otros «Ya se ha superado el presupuesto de esta categoría.»
Para Ropa y cuidado y Salud, redacta la explicación en el mismo registro: factual, sin juicio.

## Criterios de aceptación

- [ ] `/presupuesto` renderiza dentro del shell y el sidebar marca la sección activa.
- [ ] El titular es la conclusión («Vas 145 € por encima del ritmo previsto»), no la palabra «Presupuesto».
- [ ] La marca de ritmo esperado está al 61 % y es visible sobre el relleno verde del 67 %.
- [ ] Los cinco KPIs cuadran: 1.612 + 288 + 500 = 2.400; previsión 2.545 = 2.400 + 145.
- [ ] Las ocho categorías aparecen; `Otros` sale como `Agotado` y su barra no desborda la pista.
- [ ] Ningún estado se comunica solo por color: siempre palabra (`Al día`, `Por encima`, `Agotado`).
- [ ] Detalle añade la línea explicativa por categoría sin añadir ni duplicar bloques.
- [ ] Ahorro, inversión y transferencias quedan fuera del gasto de consumo y se dice explícitamente.
- [ ] `Ajustar presupuesto` hace algo real o declara que aún no está disponible.
- [ ] Ningún texto de cuerpo por debajo de 16 px ni etiqueta por debajo de 13 px; cifras tabulares.
- [ ] Foco de teclado visible en todo elemento interactivo; áreas ≥ 44 px.
- [ ] Sin scroll horizontal a 1440 px ni a 390 px (la rejilla de 5 KPIs y la de 3 tarjetas colapsan).
- [ ] `npm run lint`, `npm run test` y `npm run build` limpios, con al menos dos pruebas nuevas.

## Archivos de este paquete

- `README.md` — esto.
- `tokens.css` — idéntico a los cortes anteriores; solo por si hace falta comparar.
- `Áurea - Presupuesto.dc.html` — referencia visual navegable (Resumen y Detalle).

Los `.dc.html` son **referencias de diseño**, no código de producción: recréalos con los patrones
del proyecto, no los copies al bundle.
