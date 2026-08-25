import { describe, expect, it } from 'vitest'
import {
  buildAmortizarAnswer,
  buildGastoMayorAnswer,
  buildObjetivoAnswer,
  buildViajeAnswer,
  extraPaymentFrom,
  pickPayableDebt,
  pickWorstCategory,
} from './useRealAnswers'

describe('extraPaymentFrom', () => {
  it('redondea el disponible hoy real, sin fabricar una cifra fija', () => {
    expect(extraPaymentFrom(432.6)).toBe(433)
  })

  it('nunca devuelve un importe negativo cuando el disponible hoy es negativo', () => {
    expect(extraPaymentFrom(-120)).toBe(0)
  })
})

describe('buildViajeAnswer', () => {
  it('responde que sí cuando el disponible hoy cubre el viaje', () => {
    const answer = buildViajeAnswer(2000)
    expect(answer.headline).toBe('Sí, con 800,00 € libres después')
  })

  it('responde que no, y cuánto falta, cuando el disponible hoy no llega', () => {
    const answer = buildViajeAnswer(500)
    expect(answer.headline).toBe('No sin tocar tu ahorro: te faltarían 700,00 €')
  })
})

describe('pickWorstCategory', () => {
  it('elige la categoría con mayor desviación positiva de ritmo, ignorando las que van bien o por debajo', () => {
    const worst = pickWorstCategory([
      { name: 'Restaurantes', spentCents: 10000, budgetedCents: 8000, paceDeltaCents: 500 },
      { name: 'Transporte', spentCents: 6000, budgetedCents: 6000, paceDeltaCents: -200 },
      { name: 'Ocio', spentCents: 15000, budgetedCents: 10000, paceDeltaCents: 1200 },
    ])
    expect(worst?.name).toBe('Ocio')
  })

  it('ignora categorías sin presupuesto puesto aunque tengan paceDelta positivo', () => {
    const worst = pickWorstCategory([{ name: 'Sin presupuesto', spentCents: 5000, budgetedCents: 0, paceDeltaCents: 9999 }])
    expect(worst).toBeNull()
  })

  it('devuelve null cuando ninguna categoría se desvía por encima del ritmo', () => {
    const worst = pickWorstCategory([{ name: 'Restaurantes', spentCents: 4000, budgetedCents: 8000, paceDeltaCents: -100 }])
    expect(worst).toBeNull()
  })
})

describe('buildGastoMayorAnswer', () => {
  it('devuelve un badge "Al día" cuando no hay categoría peor', () => {
    const answer = buildGastoMayorAnswer(null)
    expect(answer.badge).toEqual({ variant: 'success', label: 'Al día' })
    expect(answer.headline).toBe('Ninguna categoría va por encima del ritmo esperado')
  })

  it('nombra la categoría y el exceso cuando sí hay una peor', () => {
    const answer = buildGastoMayorAnswer({ name: 'Ocio', spentCents: 15000, budgetedCents: 10000, paceDeltaCents: 1200 })
    expect(answer.headline).toBe('Ocio: +12 € sobre el ritmo previsto')
  })
})

describe('pickPayableDebt', () => {
  it('elige la primera deuda con cuota mensual fijada', () => {
    const debt = pickPayableDebt([
      { name: 'Hipoteca', balanceCents: 10000, annualRateBps: 300, monthlyPaymentCents: null },
      { name: 'Coche', balanceCents: 5000, annualRateBps: 500, monthlyPaymentCents: 200 },
    ])
    expect(debt?.name).toBe('Coche')
  })

  it('devuelve null si ninguna deuda tiene cuota fijada', () => {
    const debt = pickPayableDebt([{ name: 'Hipoteca', balanceCents: 10000, annualRateBps: 300, monthlyPaymentCents: null }])
    expect(debt).toBeNull()
  })
})

describe('buildObjetivoAnswer', () => {
  it('calcula los meses restantes a partir del ahorro, objetivo y aportación', () => {
    const answer = buildObjetivoAnswer({ name: 'Fondo', saved: 1000, target: 2200, monthlyContribution: 200 })
    expect(answer.calculation).toContain('6 meses desde hoy')
  })
})

describe('buildAmortizarAnswer', () => {
  it('recomienda amortizar cuando se ahorran intereses', () => {
    const answer = buildAmortizarAnswer({ name: 'Coche', balance: 8000, annualRate: 0.08, monthlyPayment: 300 }, 1000)
    expect(answer.badge.variant).toBe('success')
    expect(answer.headline).toMatch(/Ahorrarías/)
  })
})
