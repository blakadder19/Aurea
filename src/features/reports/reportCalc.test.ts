import { describe, expect, it } from 'vitest'
import { buildMonthlyReport, buildMonthlyTrend } from './reportCalc'

describe('buildMonthlyReport', () => {
  it('calcula el neto y la tasa de ahorro cuando hubo ingresos', () => {
    const report = buildMonthlyReport('julio de 2026', 320000, 276000, [], null)
    expect(report.netCents).toBe(44000)
    expect(report.savingsRatePct).toBeCloseTo(13.75, 2)
  })

  it('sin ingresos, la tasa de ahorro es null (no "0%")', () => {
    const report = buildMonthlyReport('julio de 2026', 0, 10000, [], null)
    expect(report.savingsRatePct).toBeNull()
  })

  it('ordena las categorías de mayor a menor gasto y calcula su % del total', () => {
    const report = buildMonthlyReport(
      'julio de 2026',
      0,
      100000,
      [
        { name: 'Restaurantes', spentCents: 30000 },
        { name: 'Hogar', spentCents: 50000 },
        { name: 'Ocio', spentCents: 20000 },
      ],
      null,
    )
    expect(report.categories.map((c) => c.name)).toEqual(['Hogar', 'Restaurantes', 'Ocio'])
    expect(report.categories[0].pctOfTotal).toBeCloseTo(50, 2)
  })

  it('descarta categorías con gasto 0 o negativo (no aportan nada al informe)', () => {
    const report = buildMonthlyReport('julio de 2026', 0, 10000, [{ name: 'Vacía', spentCents: 0 }], null)
    expect(report.categories).toEqual([])
  })

  it('sin datos del mes anterior, no hay comparación (todo null, no "0%")', () => {
    const report = buildMonthlyReport('julio de 2026', 0, 10000, [], null)
    expect(report.previousExpenseCents).toBeNull()
    expect(report.expenseDeltaCents).toBeNull()
    expect(report.expenseDeltaPct).toBeNull()
  })

  it('con mes anterior, calcula el delta absoluto y porcentual', () => {
    const report = buildMonthlyReport('julio de 2026', 0, 27600, [], 29100)
    expect(report.expenseDeltaCents).toBe(-1500)
    expect(report.expenseDeltaPct).toBeCloseTo((-1500 / 29100) * 100, 2)
  })

  it('mes anterior con gasto 0, no calcula un % (división por 0)', () => {
    const report = buildMonthlyReport('julio de 2026', 0, 10000, [], 0)
    expect(report.expenseDeltaCents).toBe(10000)
    expect(report.expenseDeltaPct).toBeNull()
  })
})

describe('buildMonthlyTrend', () => {
  it('calcula el neto de cada mes sin alterar ingresos ni gastos', () => {
    const points = buildMonthlyTrend([
      { monthLabel: 'jun 26', incomeCents: 200000, expenseCents: 150000 },
      { monthLabel: 'jul 26', incomeCents: 180000, expenseCents: 190000 },
    ])
    expect(points).toEqual([
      { monthLabel: 'jun 26', incomeCents: 200000, expenseCents: 150000, netCents: 50000 },
      { monthLabel: 'jul 26', incomeCents: 180000, expenseCents: 190000, netCents: -10000 },
    ])
  })

  it('con una lista vacía, devuelve una lista vacía (nunca inventa meses)', () => {
    expect(buildMonthlyTrend([])).toEqual([])
  })
})
