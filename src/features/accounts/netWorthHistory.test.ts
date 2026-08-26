import { describe, expect, it } from 'vitest'
import { periodStartIso, reconstructNetWorthSeries } from './netWorthHistory'

describe('periodStartIso', () => {
  const today = new Date(2026, 7, 25) // 25 ago 2026

  it('"Mes actual" empieza el día 1 del mes en curso', () => {
    expect(periodStartIso('Mes actual', today)).toBe('2026-08-01')
  })

  it('"3 meses" empieza el día 1 de hace dos meses (3 meses incluido el actual)', () => {
    expect(periodStartIso('3 meses', today)).toBe('2026-06-01')
  })

  it('"Año" empieza el 1 de enero del año en curso', () => {
    expect(periodStartIso('Año', today)).toBe('2026-01-01')
  })

  it('"Personalizado" usa la fecha indicada', () => {
    expect(periodStartIso('Personalizado', today, '2026-03-10')).toBe('2026-03-10')
  })

  it('"Personalizado" sin fecha cae al mes en curso', () => {
    expect(periodStartIso('Personalizado', today)).toBe('2026-08-01')
  })
})

describe('reconstructNetWorthSeries', () => {
  it('sin transacciones, el patrimonio es igual en todas las fechas', () => {
    const series = reconstructNetWorthSeries(1000, [], new Map(), '2026-08-01', '2026-08-03')
    expect(series).toEqual([
      { dateISO: '2026-08-01', netWorth: 1000 },
      { dateISO: '2026-08-02', netWorth: 1000 },
      { dateISO: '2026-08-03', netWorth: 1000 },
    ])
  })

  it('resta las transacciones posteriores a cada fecha para reconstruir el pasado', () => {
    // Hoy (03 ago) el patrimonio es 1000. El 02 ago hubo un ingreso de +200,
    // así que cada punto ya incluye lo ocurrido ese mismo día: el 01 ago
    // (antes del ingreso) el patrimonio era 800; el 02 ago (con el ingreso
    // ya contabilizado) y el 03 ago son 1000.
    const series = reconstructNetWorthSeries(
      1000,
      [{ accountId: 'a1', dateISO: '2026-08-02', amountCents: 20000 }],
      new Map([['a1', 100]]),
      '2026-08-01',
      '2026-08-03',
    )
    expect(series).toEqual([
      { dateISO: '2026-08-01', netWorth: 800 },
      { dateISO: '2026-08-02', netWorth: 1000 },
      { dateISO: '2026-08-03', netWorth: 1000 },
    ])
  })

  it('pondera cada transacción por el % de titularidad de su cuenta', () => {
    // Cuenta compartida al 50%: un gasto de -100€ solo resta 50€ al patrimonio propio.
    const series = reconstructNetWorthSeries(
      500,
      [{ accountId: 'shared', dateISO: '2026-08-02', amountCents: -10000 }],
      new Map([['shared', 50]]),
      '2026-08-01',
      '2026-08-02',
    )
    expect(series[0].netWorth).toBe(550)
  })

  it('cuentas sin % de titularidad explícito se tratan como 100%', () => {
    const series = reconstructNetWorthSeries(
      500,
      [{ accountId: 'unknown', dateISO: '2026-08-02', amountCents: 10000 }],
      new Map(),
      '2026-08-01',
      '2026-08-01',
    )
    expect(series[0].netWorth).toBe(400)
  })

  it('si el movimiento más antiguo conocido es posterior al inicio pedido, recorta el arranque en vez de fabricar una línea plana', () => {
    const series = reconstructNetWorthSeries(1000, [], new Map(), '2026-08-01', '2026-08-05', '2026-08-03')
    expect(series[0].dateISO).toBe('2026-08-03')
    expect(series.map((p) => p.dateISO)).not.toContain('2026-08-01')
  })

  it('si el movimiento más antiguo conocido es anterior o igual al inicio pedido, no recorta nada', () => {
    const series = reconstructNetWorthSeries(1000, [], new Map(), '2026-08-01', '2026-08-03', '2026-07-01')
    expect(series[0].dateISO).toBe('2026-08-01')
  })

  it('sin earliestKnownDateIso (parámetro omitido), se comporta igual que antes', () => {
    const series = reconstructNetWorthSeries(1000, [], new Map(), '2026-08-01', '2026-08-03')
    expect(series[0].dateISO).toBe('2026-08-01')
  })
})
