# Build: Áurea — corte 2, pantalla Movimientos

Paquete para ejecutar en **`blakadder19/Aurea`** (rama `main`) con Claude Code, **encima del corte 1**
(andamiaje + tokens + shell + Inicio, ya cerrado y verificado).

## Alcance de este corte

1. Ruta `/movimientos` dentro del shell existente (sidebar marca la sección activa con su contador `4`).
2. **Vista Todos los movimientos**: barra de filtros, tabla con selección múltiple, barra de acciones en lote, barra de deshacer.
3. **Vista Centro de revisión (4)**: cuatro tarjetas de revisión con nivel de confianza y acciones explícitas.
4. **Panel lateral de edición** (460 px, overlay derecho) al abrir un movimiento de la tabla.

Nada más. Presupuesto, Pagos y suscripciones, Objetivos y el resto llegan en cortes posteriores.
No se toca Inicio salvo para reutilizar componentes ya existentes.

## Stack y reglas

Mismos que el corte 1 (React 19 + TS + Vite + Tailwind 4, Radix, Zustand, React Router, Vitest).
`tokens.css` de este paquete es idéntico al del corte 1: si ya está en `src/index.css`, no lo cambies.

Se mantienen **todas** las reglas de diseño no negociables del corte 1: cuerpo ≥16 px, etiquetas ≥13 px,
áreas interactivas ≥44 px, foco visible, ningún icono ni estado solo por color, formato europeo tabular
(`−62,18 €`), títulos que dicen la conclusión, superficies blancas, verde solo para acción y positivo,
sin degradados ni gamificación.

## Estructura propuesta (añadidos)

```
src/
  features/transactions/
    TransactionsPage.tsx      ← cabecera + conmutador de vista
    FilterBar.tsx             ← buscador + 4 selects
    TransactionsTable.tsx     ← tabla + selección
    BulkActionsBar.tsx        ← banda negra de acciones en lote
    ReviewCenter.tsx          ← lista de tarjetas de revisión
    ReviewCard.tsx            ← una tarjeta (confianza + explicación + acciones)
    TransactionPanel.tsx      ← panel lateral de edición (usa SidePanel del corte 1)
  data/transactions.ts        ← datos ficticios de abajo
```
Reutiliza sin duplicar: `Card`, `Badge`, `Money`, `SectionLabel`, `SidePanel`, `UndoBar`, `lib/format.ts`.

## Especificación

Referencia visual exacta: `Áurea - Movimientos.dc.html` en este paquete (abre en el navegador).

### Cabecera
Título `Movimientos` en serif 32 px + subtítulo `148 movimientos en agosto de 2026`.
A la derecha: chip `✓ Sincronizado · 08:42` y acción principal `Añadir movimiento`.
Segunda fila: etiqueta `VISTA` + conmutador de dos botones — `Todos los movimientos` /
`Centro de revisión (4)` — en un contenedor `--color-bg` con el activo en blanco sobre borde.
El conmutador es estado de UI (Zustand), no ruta anidada.

### Vista 1 — Todos los movimientos

**Barra de filtros** (tarjeta blanca, radio 16): input de búsqueda que crece (`Buscar por comercio,
importe o nota`, ≥260 px) + cuatro selects de 44 px: fecha (`Este mes`), cuenta (`Todas las cuentas`),
categoría (`Todas las categorías`), estado (`Cualquier estado`). Todos con `aria-label`.
Los filtros no tienen que filtrar de verdad en este corte, pero **sí** deben ser controles reales
con estado; la búsqueda por texto sobre `comercio` sí debe funcionar.

**Barra de acciones en lote**: aparece solo cuando hay selección. Banda negra `#161A19`, radio 14,
texto `N movimientos seleccionados` a la izquierda y a la derecha `Cambiar categoría` (botón blanco),
`Añadir etiqueta` y `Cancelar` (contorno). Estado inicial de la demo: 2 filas seleccionadas
(AMZN Mktp ES y Zara · devolución) para que la barra se vea sin interactuar.

**Tabla** (tarjeta blanca radio 20, `overflow: hidden`, `font-variant-numeric: tabular-nums`):
cabecera sobre `--color-bg` con columnas Checkbox / Fecha / Comercio / Cuenta / Categoría / Importe
(la última alineada a la derecha). Filas de 16 px, comercio en peso 600, categoría como chip gris con
borde, importe 17 px peso 700 — negro en gastos normales, `--color-green` en entradas, rojo en
`Sin clasificar` pendiente de revisión. Fila seleccionada con fondo `--color-bg`.
Click en la fila (o `Enter` con foco) abre el panel lateral. La casilla no propaga el click.
Los checkbox miden 20 px con área de pulsación de 44 px.

**Barra de deshacer** al pie: «Categoría de «Verdeo Café» cambiada a Restaurantes.» + botón `Deshacer`.

### Vista 2 — Centro de revisión (4)
Frase de contexto: «Cuatro movimientos no se clasificaron con suficiente confianza. Revísalos uno a uno.»
Cuatro tarjetas blancas radio 20, cada una con: titular en 17/700 con importe, línea de fecha y
confianza en 15 px, chip de confianza a la derecha (verde ≥90 %, ámbar 60–89 %, rojo <60 %, o
`Subida de precio`), caja `--color-bg` con la **explicación en lenguaje llano de por qué** se propone
esa clasificación, y botonera visible (nunca menú de tres puntos):

1. `Transferencia Openbank → Compartida · 1.120,45 €` — 18 ago, 94 % → `Confirmar` / `Corregir` / `Descartar` / `Crear regla`.
2. `Zara · devolución · +49,95 €` — 16 ago, 71 % → mismas cuatro acciones.
3. `AMZN Mktp ES · −34,90 €` — 18 ago, 52 %, ambiguo Hogar/Ocio → `Elegir Hogar` / `Elegir Ocio` / `Descartar`.
4. `Spotify sube de 10,99 € a 11,99 €` — 24 ago, detectado por cambio de importe → `Aceptar el cambio` / `Ver suscripción`.

Al resolver una tarjeta: sale de la lista, el contador del conmutador y el badge del sidebar bajan, y
aparece la barra de deshacer. Con la lista vacía, estado vacío con texto («No queda nada por revisar»),
nunca una tarjeta en blanco.

### Panel lateral de edición
Overlay `rgba(22,26,25,0.35)` + panel derecho de 460 px a altura completa, scroll propio.
Contenido: etiqueta `EDITAR MOVIMIENTO`, nombre del comercio en serif 26, importe en serif 34 tabular
(`−62,18 €`), línea `19 ago 2026 · Nómina · Openbank`, campos Categoría (select), Etiquetas (input),
Notas (textarea), y acciones `Dividir en varias categorías`, `Adjuntar recibo`, `Guardar cambios`
(principal verde). Cierre con botón `✕` de 44 px, `Esc` y click en el overlay. Foco atrapado dentro
del panel y devuelto a la fila al cerrar (Radix Dialog lo da hecho).

## Datos ficticios (usar tal cual; consistentes con el corte 1)

Mismo contexto: **Marta Ríos**, miércoles 19 de agosto de 2026, 148 movimientos en el mes.

| Fecha | Comercio | Cuenta | Categoría | Importe | Estado |
|---|---|---|---|---|---|
| 19 ago | Mercadona | Nómina · Openbank | Supermercado | −62,18 € | Confirmado |
| 18 ago | Verdeo Café | Revolut | Restaurantes | −9,40 € | Confirmado |
| 18 ago | AMZN Mktp ES | Nómina · Openbank | Sin clasificar | −34,90 € | Requiere revisión |
| 17 ago | Renfe | Compartida · CaixaBank | Transporte | −28,60 € | Confirmado |
| 16 ago | Zara · devolución | Nómina · Openbank | Sin clasificar | +49,95 € | Requiere revisión |
| 15 ago | Iberdrola | Compartida · CaixaBank | Hogar | −78,45 € | Confirmado |
| 14 ago | Filmin | Nómina · Openbank | Ocio | −7,99 € | Confirmado |
| 13 ago | Estudio Nube · freelance | Nómina · Openbank | Ingresos | +640,00 € | Confirmado |

Cuentas disponibles en los filtros: Nómina · Openbank, Compartida · CaixaBank, Revolut, Efectivo.
Categorías: Supermercado, Restaurantes, Hogar y facturas, Transporte, Ocio y suscripciones,
Ropa y cuidado, Salud, Otros, Ingresos, Sin clasificar.
Comercios siempre reales y creíbles. Nunca «Comercio 1».

## Criterios de aceptación

- [ ] `/movimientos` renderiza dentro del shell del corte 1 y el sidebar marca la sección activa.
- [ ] El conmutador cambia entre tabla y Centro de revisión sin navegar ni recargar.
- [ ] Ningún texto de cuerpo por debajo de 16 px ni etiqueta por debajo de 13 px.
- [ ] Importes tabulares con signo explícito `−`/`+`; el color nunca es la única señal.
- [ ] Seleccionar filas muestra la barra de acciones en lote con el recuento correcto; `Cancelar` la vacía.
- [ ] La casilla de selección no abre el panel; el click en el resto de la fila sí.
- [ ] El panel se cierra con `✕`, `Esc` y click en el overlay, y devuelve el foco a la fila de origen.
- [ ] La búsqueda por comercio filtra la tabla en vivo y muestra un estado vacío con texto si no hay resultados.
- [ ] Resolver una tarjeta de revisión baja el contador del conmutador y del badge del sidebar.
- [ ] Todas las acciones tienen texto visible; no hay menús de tres puntos como única vía.
- [ ] Foco de teclado visible en todo elemento interactivo; áreas ≥ 44 px.
- [ ] Sin scroll horizontal a 1440 px ni a 390 px (la tabla scrollea en su propia tarjeta, nunca la página).
- [ ] `npm run lint`, `npm run test` y `npm run build` limpios.

## Archivos de este paquete

- `README.md` — esto.
- `tokens.css` — idéntico al corte 1; solo por si hace falta comparar.
- `Áurea - Movimientos.dc.html` — referencia visual navegable (tabla, Centro de revisión y panel).

Los `.dc.html` son **referencias de diseño**, no código de producción: recréalos con los patrones
del proyecto, no los copies al bundle.
