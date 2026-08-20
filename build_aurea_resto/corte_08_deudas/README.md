# Build: Áurea — corte 08, Deudas

Parte del paquete `build_aurea_resto/`. Lee antes `../PLAN.md` (orden, reglas comunes y datos de referencia).
Se construye encima de los cortes anteriores.

Ruta: `/deudas` · carpeta `src/features/debts/`
Referencia visual exacta: el `.dc.html` de esta carpeta (abre en el navegador).

## Alcance

1. **Tabla de cuatro deudas**: Hipoteca 148.320 € al 2,85 % (612,40 €/mes) · Coche 6.480 € al 6,40 % (186,20 €/mes) · Tarjeta 842,30 € · Portátil 720 € al 0 % (4 cuotas de 180 €). Columnas: Deuda / Saldo / Tipo / Cuota / Próximo pago / Fin previsto.
2. Total de pasivos **−156.362,30 €** coherente con Cuentas y patrimonio.
3. **Bola de nieve vs. avalancha lado a lado**, con las **mismas cifras de partida** y el mismo formato: orden de pago, intereses totales, fecha de fin. **No se declara ganadora** — se explica en una línea qué prioriza cada método y se deja elegir.
4. Panel **simulador de pago extraordinario**: importe a aportar → intereses ahorrados, tiempo adelantado y nueva fecha de fin, etiquetado `Simulación`.
5. La tarjeta de crédito, por ser deuda a corto plazo, se muestra con su cargo del 2 sep (842,30 €) enlazado a Pagos y suscripciones.

Nada más. Si detectas algo que falta, anótalo en `docs/DUDAS.md` y sigue.

## Criterios de aceptación

- [ ] La suma de saldos cuadra con los pasivos: 148.320 + 6.480 + 842,30 + 720 = 156.362,30.
- [ ] Las dos estrategias parten de las mismas cifras y ninguna se presenta como la ganadora.
- [ ] El simulador devuelve intereses ahorrados, meses adelantados y nueva fecha de fin, etiquetado como simulación.
- [ ] Ningún importe de deuda aparece sin signo ni color; los negativos llevan `−`.
- [ ] Sin tono moralizante ni lenguaje de culpa en ningún texto.
- [ ] Ningún texto de cuerpo por debajo de 16 px ni etiqueta por debajo de 13 px; cifras tabulares.
- [ ] Foco de teclado visible en todo elemento interactivo; áreas ≥ 44 px.
- [ ] Sin scroll horizontal a 1440 px ni a 390 px.
- [ ] `npm run lint`, `npm run test` y `npm run build` limpios, con al menos dos pruebas nuevas.

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
