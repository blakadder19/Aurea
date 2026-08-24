import { describe, expect, it } from 'vitest'
import { computeCategoryPace, daysElapsedInMonth, daysInMonth, forecastCents } from './budgetCalc'

describe('daysInMonth', () => {
  it('agosto de 2026 tiene 31 días', () => {
    expect(daysInMonth(2026, 7)).toBe(31)
  })
  it('febrero de 2028 (bisiesto) tiene 29 días', () => {
    expect(daysInMonth(2028, 1)).toBe(29)
  })
})

describe('daysElapsedInMonth', () => {
  it('19 de agosto de 2026 → día 19', () => {
    expect(daysElapsedInMonth(new Date(2026, 7, 19))).toBe(19)
  })
})

describe('computeCategoryPace', () => {
  it('sin presupuesto (0), no hay ritmo esperado ni delta', () => {
    const pace = computeCategoryPace(0, 5000, 19, 31)
    expect(pace.expectedPaceCents).toBeNull()
    expect(pace.paceDeltaCents).toBeNull()
    expect(pace.status).toBe('Al día')
  })

  it('gasto por encima del ritmo esperado → Por encima', () => {
    // 400€ presupuestados, día 19 de 31 → ritmo esperado ≈ 245,16€. Gastado 312€ → por encima.
    const pace = computeCategoryPace(40000, 31200, 19, 31)
    expect(pace.expectedPaceCents).toBe(24516)
    expect(pace.paceDeltaCents).toBe(31200 - 24516)
    expect(pace.status).toBe('Por encima')
  })

  it('gastado >= presupuestado → Agotado, aunque vaya "al ritmo"', () => {
    const pace = computeCategoryPace(10000, 10000, 1, 31)
    expect(pace.status).toBe('Agotado')
    expect(pace.remainingCents).toBe(0)
  })

  it('por debajo del ritmo esperado → Al día', () => {
    // 400€ presupuestados, día 19 de 31 → ritmo esperado ≈ 245,16€. Gastado 200€ → por debajo.
    const pace = computeCategoryPace(40000, 20000, 19, 31)
    expect(pace.status).toBe('Al día')
    expect(pace.paceDeltaCents).toBeLessThan(0)
  })
})

describe('forecastCents', () => {
  it('proyecta linealmente el gasto acumulado hasta fin de mes', () => {
    expect(forecastCents(161200, 19, 31)).toBe(Math.round((161200 / 19) * 31))
  })
  it('día 0 (mes futuro): la previsión es el propio gasto (0)', () => {
    expect(forecastCents(0, 0, 31)).toBe(0)
  })
  it('nunca por debajo de lo ya gastado', () => {
    expect(forecastCents(100000, 30, 31)).toBeGreaterThanOrEqual(100000)
  })
})
