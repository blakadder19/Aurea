# Build: Áurea — corte 04, Cuentas y patrimonio

Parte del paquete `build_aurea_resto/`. Lee antes `../PLAN.md` (orden, reglas comunes y datos de referencia).
Se construye encima de los cortes anteriores.

Ruta: `/cuentas` · carpeta `src/features/accounts/`
Referencia visual exacta: el `.dc.html` de esta carpeta (abre en el navegador).

## Alcance

1. KPIs de cabecera: **Activos 344.526,57 €**, **Pasivos −156.362,30 €** (rojo), **Patrimonio neto 188.164,27 €** con chip `▲ +1.284 € · +0,7 %`.
2. Tabla de cuentas con columna **Función**: Para gastar, Ahorro, Inversión, Deuda, Activo manual, Por confirmar (badge con **borde discontinuo**). Columnas: Cuenta / Institución / Función / Saldo / Última sincronización.
3. La cuenta **Revolut** está en USD: muestra `1.860,00 USD` y `≈ 1.707,48 €` con el tipo (`0,9180`) y **la fecha del tipo de cambio visible**. Nunca solo el euro convertido.
4. La hucha «Viaje Japón» (2.150 €) sale como `◌ Por confirmar` con acción `Asignar función`, y se dice que **no** cuenta en Disponible hoy.
5. Clic en una fila abre el **panel lateral de detalle de cuenta**: saldo, función, movimientos recientes de esa cuenta, y acciones `Cambiar función` / `Renombrar` / `Desconectar`.
6. Modo **Detalle**: añade desglose por **clase de activo** (efectivo, ahorro, inversión, cripto, inmueble) y por **institución**, sin repetir la tabla de cuentas.

Nada más. Si detectas algo que falta, anótalo en `docs/DUDAS.md` y sigue.

## Criterios de aceptación

- [ ] Los tres KPIs cuadran: 344.526,57 − 156.362,30 = 188.164,27.
- [ ] La suma de las cuentas de función «Para gastar» da 7.246,57 € (coherente con Inicio).
- [ ] Revolut muestra importe en USD, conversión, tipo y fecha del tipo.
- [ ] La hucha por confirmar lleva badge de borde discontinuo y acción para asignar función.
- [ ] La fila abre el panel; el panel cierra con ✕, Esc y clic fuera y devuelve el foco.
- [ ] Detalle añade los dos desgloses sin duplicar la tabla de cuentas.
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
