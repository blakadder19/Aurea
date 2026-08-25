import { describe, expect, it } from 'vitest'
import {
  computeCategoryPace,
  cycleEnd,
  cycleStart,
  daysElapsedInCycle,
  daysElapsedInMonth,
  daysInCycle,
  daysInMonth,
  forecastCents,
  isoDate,
} from './budgetCalc'

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
  it('sin presupuesto (0), no hay ritmo esperado ni delta, y el estado es "Sin presupuesto" (no "Al día")', () => {
    const pace = computeCategoryPace(0, 5000, 19, 31)
    expect(pace.expectedPaceCents).toBeNull()
    expect(pace.paceDeltaCents).toBeNull()
    expect(pace.status).toBe('Sin presupuesto')
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

describe('isoDate', () => {
  it('formatea en fecha local, sin desplazarse a UTC', () => {
    expect(isoDate(new Date(2026, 7, 5))).toBe('2026-08-05')
  })
})

describe('cycleStart', () => {
  it('con startDay=1, el ciclo es el mes en curso (comportamiento igual al de siempre)', () => {
    expect(cycleStart(new Date(2026, 7, 19), 1)).toEqual(new Date(2026, 7, 1))
  })

  it('startDay=25 y hoy es después del día 25: el ciclo empezó este mes', () => {
    expect(cycleStart(new Date(2026, 7, 30), 25)).toEqual(new Date(2026, 7, 25))
  })

  it('startDay=25 y hoy es antes del día 25: el ciclo empezó el mes anterior', () => {
    expect(cycleStart(new Date(2026, 7, 10), 25)).toEqual(new Date(2026, 6, 25))
  })

  it('el propio día de inicio ya cuenta como parte del ciclo nuevo', () => {
    expect(cycleStart(new Date(2026, 7, 25), 25)).toEqual(new Date(2026, 7, 25))
  })
})

describe('cycleEnd / daysInCycle', () => {
  it('un ciclo que empieza el 25 ago termina el 25 sep (32 días, agosto tiene 31)', () => {
    const start = new Date(2026, 7, 25)
    expect(cycleEnd(start)).toEqual(new Date(2026, 8, 25))
    expect(daysInCycle(start)).toBe(31)
  })

  it('un ciclo que empieza el día 1 dura los días del mes en curso', () => {
    expect(daysInCycle(new Date(2026, 7, 1))).toBe(31)
  })
})

describe('daysElapsedInCycle', () => {
  it('el propio día de inicio del ciclo es el día 1', () => {
    expect(daysElapsedInCycle(new Date(2026, 7, 25), new Date(2026, 7, 25))).toBe(1)
  })

  it('cuenta días desde el inicio del ciclo, no desde el 1 del mes', () => {
    // ciclo 25 ago → 25 sep; hoy 5 sep = día 12 del ciclo (25,26,...,31 ago = 7 días + 1..5 sep = 5 días)
    expect(daysElapsedInCycle(new Date(2026, 8, 5), new Date(2026, 7, 25))).toBe(12)
  })

  it('nunca supera la longitud del ciclo', () => {
    const start = new Date(2026, 7, 25)
    expect(daysElapsedInCycle(new Date(2026, 8, 30), start)).toBe(daysInCycle(start))
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
