# Áurea — plan de los cortes restantes (4 a 13)

Paquete para `blakadder19/Aurea` (rama `main`). Los cortes 1 (Inicio), 2 (Movimientos) y
3 (Presupuesto) ya están cerrados y verificados.

## Cómo trabajar esto en automático

Haz los cortes **en orden**, uno por uno, sin parar a preguntar entre ellos. Para cada corte:

1. Lee `corte_NN_<nombre>/README.md` y abre su `.dc.html` de referencia en el navegador.
2. Implementa la ruta y los bloques descritos, reutilizando lo que ya existe.
3. Verifica **uno por uno** los criterios de aceptación del corte y deja `lint`, `test` y `build` limpios.
4. Commit con mensaje `corte NN: <pantalla>` y pasa al siguiente.
5. Solo párate si un corte contradice algo ya construido o si faltan datos: entonces anota la duda,
   toma la decisión más conservadora, sigue adelante y deja la duda en `docs/DUDAS.md`.

Al terminar los diez cortes, escribe `docs/CURRENT.md` con el estado final: rutas, componentes
compartidos, decisiones tomadas y lo que queda fuera (datos reales, Supabase, Enable Banking).

## Orden

| Corte | Pantalla | Ruta | Carpeta |
|---|---|---|---|
| 4 | Cuentas y patrimonio | `/cuentas` | `corte_04_cuentas/` |
| 5 | Pagos y suscripciones | `/pagos` | `corte_05_pagos/` |
| 6 | Objetivos | `/objetivos` | `corte_06_objetivos/` |
| 7 | Inversiones | `/inversiones` | `corte_07_inversiones/` |
| 8 | Deudas | `/deudas` | `corte_08_deudas/` |
| 9 | Planificación | `/planificacion` | `corte_09_planificacion/` |
| 10 | Asistente e insights | `/asistente` | `corte_10_asistente/` |
| 11 | Conexiones y ajustes | `/ajustes` | `corte_11_ajustes/` |
| 12 | Variantes móviles | transversal | `corte_12_movil/` |
| 13 | Estados de sistema | transversal | `corte_13_estados/` |

Tras el corte 11 todas las entradas del sidebar llevan a una pantalla real: ningún `href="#"`.

## Reglas comunes (aplican a todos los cortes)

- Se construye **encima** de los cortes anteriores: no se reescribe el shell, ni los tokens, ni componentes ya existentes.
- Reutiliza `Card`, `Badge`, `ProgressBar`, `PaceBar`, `Money`, `SectionLabel`, `SidePanel`, `UndoBar`, `lib/format.ts`. Si necesitas una variante, añade una prop; no dupliques el componente.
- Cuerpo ≥16 px, etiquetas ≥13 px, áreas interactivas ≥44 px, foco de teclado visible (3 px `#0F6B4F`).
- Estado = color + icono + palabra (`✓ Al día`, `▲ Por encima`, `! Requiere revisión`, `◌ Por confirmar`). Nunca solo color.
- Formato europeo tabular: `5.383,24 €`, `+0,7 %`, `19 ago 2026`. Negativos con `−` explícito.
- Los titulares dicen la conclusión, no la categoría.
- Ningún icono sin etiqueta de texto. Ningún menú de tres puntos como única vía a una acción.
- Cifras estimadas o simuladas van siempre etiquetadas (`Estimación`, `Simulación`, `Cotizaciones simuladas`, `Demostración`).
- Paneles laterales: overlay `rgba(22,26,25,0.35)` + panel derecho de 460 px, cierre con `✕`, `Esc` y clic fuera, foco devuelto al origen.
- Sin degradados protagonistas, glassmorphism, gamificación, confeti ni tono moralizante sobre el gasto.
- Sin scroll horizontal a 1440 px ni a 390 px: las tablas scrollean en su propia tarjeta, nunca la página.
- Cada corte cierra con `npm run lint`, `npm run test` y `npm run build` limpios y al menos dos pruebas nuevas.
- Los `.dc.html` son **referencias de diseño**, no código: recréalos con los patrones del proyecto, no los copies al bundle.

## Datos de referencia (persona: Marta Ríos, 34, Madrid · miércoles 19 ago 2026)

Fuente única de verdad; todas las pantallas deben cuadrar con esto.

- Disponible hoy **5.383,24 €** = 7.246,57 € en cuentas para gastar − 1.863,33 € de compromisos a 14 días.
- Patrimonio neto **188.164,27 €** (+1.284 €, +0,7 %) = Activos 344.526,57 € − Pasivos 156.362,30 €.
- Cuentas: Nómina Openbank 4.238,64 € · Compartida CaixaBank 1.120,45 € · Revolut 1.860,00 USD (≈1.707,48 € a 0,9180) · Efectivo 180,00 € · Ahorro 12.400 € · Hucha «Viaje Japón» 2.150 € (por confirmar) · Inversiones 38.920 € · Cripto 4.310 € · Tarjeta −842,30 € (crédito disponible 3.157,70 €).
- Presupuesto agosto: 2.400 presupuestado · 1.612 gastado · 288 comprometido · 500 restante · previsión 2.545 €.
- Objetivos: Emergencia 8.900/11.880 € (4,5 de 6 meses) · Japón 2.150/4.000 € · Reforma 3.500/15.000 €.
- Inversiones: 38.920 € valor · 32.400 € aportado · +6.520 € (+20,1 %). Cripto 4.310 € sobre 3.000 € aportados.
- Deudas: Hipoteca 148.320 € al 2,85 % (612,40 €/mes) · Coche 6.480 € al 6,40 % (186,20 €/mes) · Tarjeta 842,30 € · Portátil 720 € al 0 % (4×180 €).
- Próximos 14 días: Netflix 13,99 (22 ago) · Spotify 11,99 (24 ago, sube desde 10,99) · Luz 78,45 (25 ago) · Internet y móvil 46,90 (27 ago) · Coche 186,20 (28 ago) · Seguro hogar 31,20 (30 ago) · Nómina +3.150 (31 ago) · Hipoteca 612,40 + Gimnasio 39,90 (1 sep) · Tarjeta 842,30 (2 sep).
- Comercios siempre reales y creíbles (Mercadona, Renfe, Iberdrola, Zara, Filmin, Verdeo Café). Nunca «Comercio 1».

## Archivos

- `PLAN.md` — esto.
- `tokens.css` — idéntico al del corte 1; solo para comparar.
- `corte_NN_*/README.md` + su `.dc.html` de referencia.
