# Build: Áurea — arranque en repo vacío + pantalla Inicio

Paquete para ejecutar en **`blakadder19/Aurea`** (rama `main`, actualmente vacío) con Claude Code.

> Existe una implementación anterior de Áurea en `blakadder19/Aurea---Finanzas` (rama `master`):
> React 19 + Vite + Tailwind 4 + Radix + Supabase + Enable Banking, con bloques 1–6B cerrados.
> **No es el objetivo de este build** — pero es la mejor fuente para copiar la capa de servidor
> (`server/`), las migraciones (`supabase/migrations/`) y la lógica de dominio ya probada
> (`src/features/goals/*.ts`) cuando lleguemos a datos reales. Consúltala antes de reinventar backend.

## Alcance de este primer corte

1. Andamiaje del proyecto (React + TypeScript + Vite + Tailwind 4).
2. Tokens del sistema visual de Áurea (archivo `tokens.css` de este paquete, va a `src/index.css`).
3. Shell de la app: barra lateral fija de 250 px + cabecera constante.
4. **Pantalla Inicio completa** en sus modos Resumen y Detalle, con datos ficticios en el código.

Nada más. Movimientos, Presupuesto y el resto llegan en cortes posteriores.

## Stack

```
React 19 + TypeScript + Vite
Tailwind CSS 4 (tokens con @theme en src/index.css)
Radix UI para primitives (dialog, tabs, select, checkbox, toast)
Recharts para la curva de patrimonio
Zustand para estado de UI (modo Resumen/Detalle, panel abierto)
React Router para las rutas de sección
Vitest + Testing Library
```

Fuentes: **Source Serif 4** e **Inter** desde Google Fonts (peso 400/600/700).

## Estructura propuesta

```
src/
  index.css                 ← tokens.css de este paquete
  main.tsx
  app/
    App.tsx                 ← router + layout
    AppShell.tsx            ← sidebar + header
  components/
    Card.tsx  Badge.tsx  ProgressBar.tsx  Money.tsx  SectionLabel.tsx
    SidePanel.tsx           ← overlay derecho de 460 px
    UndoBar.tsx
  features/home/
    HomePage.tsx
    AvailableTodayCard.tsx  ← cifra hero + desglose expandible
    NetWorthCard.tsx        ← KPI + curva
    BudgetPaceCard.tsx      ← ritmo real vs esperado
    UpcomingTimeline.tsx    ← 14 días
    AttentionTray.tsx       ← 4 tareas
    ExplainableInsight.tsx
    RecentTransactions.tsx
  data/demo.ts              ← todas las cifras de la sección "Datos" de abajo
  lib/format.ts             ← formato europeo de dinero/porcentaje/fecha
```

## Reglas de diseño que el código debe respetar (no negociables)

- Cuerpo mínimo **16 px**, etiquetas mínimo **13 px**. Nada de grises diminutos.
- Contraste alto: texto principal `#161A19` sobre blanco. Mínimo 4,5:1 en texto, 7:1 en cifras clave.
- **Ningún icono sin etiqueta de texto.** Ningún menú de tres puntos como única vía a una acción.
- Los títulos dicen la conclusión: `Vas 145 € por encima del ritmo previsto`, nunca `Presupuesto`.
- Estado = color **+ icono + palabra** (`▲ Por encima del ritmo`, `✓ Al día`, `! Requiere revisión`, `◌ Por confirmar`).
- Formato europeo con cifras tabulares: `5.383,24 €`, `+0,7 %`, `19 ago 2026`. Negativos con signo `−` explícito y color, nunca solo paréntesis.
- Áreas interactivas ≥ **44 px**. Foco de teclado visible y grueso (ya en tokens).
- Máximo 4–5 bloques por pantalla en Resumen. Espacio en blanco antes que rejilla de tarjetas.
- El verde es solo acción y positivo. Las superficies son blancas.
- Toda información importante disponible también en formato tabla (modo Detalle).
- Sin degradados protagonistas, glassmorphism, gamificación, confeti ni tono moralizante sobre el gasto.

## Pantalla Inicio — especificación

Referencia visual exacta: `Áurea — Inicio.dc.html` en este paquete (abre en el navegador).

### Cabecera
Título `Inicio` en serif 32 px + fecha de contexto `Miércoles 19 ago 2026 · agosto de 2026`.
A la derecha: chip de sincronización `✓ Sincronizado · 08:42`, botón `Avisos` con contador 4,
acción principal `Añadir movimiento`. Segunda fila: selector de periodo
(Mes actual / 3 meses / Año / Personalizado) y conmutador **Resumen / Detalle**.

### Bloque 1 — Disponible hoy (columna izquierda, 1,25fr)
- Etiqueta de sección `DISPONIBLE HOY`.
- Cifra hero serif **72 px / peso 600 / tabular**: `5.383,24 €`.
- Frase de apoyo 18 px: «Puedes gastar esto sin tocar tu ahorro ni dejar sin cubrir los pagos de los próximos 14 días.»
- Botón `Ver cómo se calcula` (borde verde) que expande in-place — no modal — un desglose en forma de resta:
  cada cuenta apta, suma `7.246,57 €`, línea roja `− Compromisos hasta el 2 sep (9 pagos) −1.863,33 €`,
  y total `Disponible hoy 5.383,24 €` sobre un filete negro de 2 px.
- Debajo, bloque «Qué no entra en esta cifra» con chips: ahorro 12.400 €, hucha Viaje Japón 2.150 € (borde discontinuo, por confirmar), inversiones 38.920 €, cripto 4.310 €, crédito de la tarjeta 3.157,70 €.

### Bloque 2 — Patrimonio neto (columna derecha, arriba)
KPI serif 40 px `188.164,27 €`, chip verde `▲ +1.284 € · +0,7 %`, frase «Has ganado 1.284 € de patrimonio este mes»,
curva de 12 meses (Recharts, línea `--color-green`, sin relleno ni decoración), etiquetas `sep 2025` / `ago 2026`,
y pie con `Activos 344.526,57 €` / `Pasivos −156.362,30 €` en rojo.

### Bloque 3 — Presupuesto (columna derecha, abajo)
Titular-conclusión serif 26 px «Vas 145 € por encima del ritmo previsto» + chip ámbar `▲ Por encima`.
Línea `1.612 € gastados de 2.400 € presupuestados · 67 %`.
Barra de 16 px: fondo `--color-green-soft`, relleno verde al 67 %, **marca vertical negra de 3 px al 61 %**
(ritmo esperado, día 19 de 31), con leyenda `Ritmo real 67 %` / `Ritmo esperado 61 %`.
Pie con tres KPIs: Previsión de cierre `2.545 €` (ámbar), Restante `500 €`, Comprometido `288 €`.

### Bloque 4 — Próximos 14 días (ancho completo)
Titular «Salen 1.863,33 € y entran 3.150 € en los próximos 14 días» + subtítulo «Del 19 ago al 2 sep · 9 pagos y 1 cobro»
+ enlace `Ver pagos y suscripciones`.
Eje horizontal de 15 días (19 ago → 2 sep) con marcadores.
**Implementación crítica:** los importes NO caben en columnas de grid de ancho fijo (~67 px) y se
envuelven en varias líneas. Cada marcador debe ser un bloque `position: absolute` centrado sobre su
día (`left: 50%; transform: translateX(-50%); white-space: nowrap`) con **alturas alternas** (dos
niveles) para que no colisionen. El último día alinea a la derecha. `1 sep` agrupa hipoteca y
gimnasio en un solo hito de `−652,30 €`.
En modo Detalle, debajo del eje aparece la tabla de los mismos hitos (Fecha / Concepto / Tipo / Cuenta / Importe).

### Bloque 5 — Necesita tu atención (mitad izquierda)
Cuatro tarjetas accionables, cada una con badge de estado, titular-conclusión, explicación y botones:
1. `! Requiere revisión` — «4 movimientos esperan tu confirmación» → `Abrir Centro de revisión`.
2. `▲ Subida de precio` — «Spotify pasa de 10,99 € a 11,99 € el 24 ago» → `Aceptar el cambio` / `Ver suscripción`.
3. `◌ Por confirmar` — «La hucha «Viaje Japón» aún no cuenta en tus cifras» → `Asignar función`.
4. `! Pago grande a la vista` — «La tarjeta carga 842,30 € el 2 sep» → `Ver detalle de la tarjeta`.

### Bloque 6 — Insight explicable (mitad derecha, fondo `--color-green-soft`)
Etiqueta `INSIGHT · ESTIMACIÓN`, titular «Tres ajustes pequeños dejan el mes en 2.400 €»,
y una caja blanca «El cálculo, a la vista» con las dos desviaciones (restaurantes +109 €, transporte +36 €)
y el total +145 €. Acciones: `Ajustar el presupuesto` y enlace `Ver el cálculo completo`.

### Bloque 7 — Últimos movimientos (mitad derecha, debajo)
Tabla de 8 filas con Fecha / Comercio / Categoría / Importe. En modo **Detalle** añade columnas
Cuenta y Estado. Enlace `Ver los 148 del mes`.

### Modo Detalle — qué cambia
Añade: columnas Cuenta y Estado en movimientos, tabla de hitos de 14 días, y un bloque nuevo
«Dónde se va el presupuesto de agosto» con las 8 categorías (presupuestado, gastado, barra de ritmo, estado).
No cambia la arquitectura ni repite bloques ya visibles.

### Barra de confirmación
Al final, banda con «Categoría de «Verdeo Café» cambiada a Restaurantes.» + botón `Deshacer`.
Patrón reutilizable para toda acción reversible.

## Datos ficticios (usar tal cual: cuadran entre sí)

Persona: **Marta Ríos**, 34, Madrid. Diseñadora de producto en plantilla con ingresos freelance.
Fecha de contexto: **miércoles 19 de agosto de 2026**.

- **Disponible hoy 5.383,24 €** = 7.246,57 € (Nómina Openbank 4.238,64 + Compartida CaixaBank 1.120,45 + Revolut 1.860,00 USD a 0,9180 ≈ 1.707,48 + Efectivo 180,00) − 1.863,33 € de compromisos a 14 días.
- **Patrimonio neto 188.164,27 €** (+1.284 €, +0,7 %) = Activos 344.526,57 € − Pasivos 156.362,30 €.
- Fuera de Disponible hoy: ahorro 12.400 €, hucha «Viaje Japón» 2.150 € (por confirmar), inversiones 38.920 €, cripto 4.310 €, crédito de tarjeta 3.157,70 €.
- **Presupuesto agosto**: 2.400 € presupuestado · 1.612 € gastado · 288 € comprometido · 500 € restante · previsión 2.545 € (+145 €).
- Categorías: Supermercado 312/480 · Restaurantes 312/400 · Hogar y facturas 404/620 · Transporte 96/160 · Ocio y suscripciones 148/240 · Ropa y cuidado 84/200 · Salud 38/120 · Otros 218/180 (agotado).
- **Próximos 14 días**: Netflix 13,99 € (22 ago) · Spotify 11,99 € (24 ago) · Luz 78,45 € (25 ago) · Internet y móvil 46,90 € (27 ago) · préstamo coche 186,20 € (28 ago) · seguro hogar 31,20 € (30 ago) · nómina +3.150 € (31 ago) · hipoteca 612,40 € (1 sep) · gimnasio 39,90 € (1 sep) · tarjeta 842,30 € (2 sep).
- **Últimos movimientos**: 19 ago Mercadona −62,18 € (Supermercado, Nómina, Confirmado) · 18 ago Verdeo Café −9,40 € (Restaurantes, Revolut) · 18 ago AMZN Mktp ES −34,90 € (Sin clasificar, Requiere revisión) · 17 ago Renfe −28,60 € (Transporte, Compartida) · 16 ago Zara devolución +49,95 € (Requiere revisión) · 15 ago Iberdrola −78,45 € (Hogar) · 14 ago Filmin −7,99 € (Ocio) · 13 ago Estudio Nube freelance +640,00 € (Ingresos).
- Insight: Restaurantes 312 € en 19 días → ritmo 509 €/mes (+109 €); Transporte 96 € frente a 60 € previstos (+36 €); desvío total +145 €.

Comercios siempre reales y creíbles (Mercadona, Renfe, Iberdrola, Zara, Filmin, Verdeo Café). Nunca «Comercio 1».

## Criterios de aceptación

- [ ] `npm run dev` arranca y `/` renderiza Inicio con sidebar y cabecera.
- [ ] Ningún texto de cuerpo por debajo de 16 px ni etiqueta por debajo de 13 px.
- [ ] La cifra hero es serif ≥ 64 px y tabular.
- [ ] `Ver cómo se calcula` expande y colapsa el desglose sin navegar ni abrir modal.
- [ ] La suma del desglose cuadra: 7.246,57 − 1.863,33 = 5.383,24.
- [ ] En la línea de 14 días, **cada importe cabe en una sola línea** a ≥ 15 px y ninguna etiqueta se solapa.
- [ ] El conmutador Resumen/Detalle añade columnas y tablas sin duplicar bloques ya visibles.
- [ ] Todos los botones e iconos llevan texto visible; ningún estado se comunica solo por color.
- [ ] Foco de teclado visible en todo elemento interactivo; áreas ≥ 44 px.
- [ ] Sin scroll horizontal a 1440 px ni a 390 px.

## Archivos de este paquete

- `README.md` — esto.
- `tokens.css` — pegar como `src/index.css`.
- `Áurea — Inicio.dc.html` — referencia visual navegable de Inicio (Resumen y Detalle).

Los `.dc.html` son **referencias de diseño**, no código de producción: recréalos con los patrones
del proyecto, no los copies al bundle.
