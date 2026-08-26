import { describe, expect, it } from 'vitest'
import { avalancheOrder, compareDebtStrategies, snowballOrder, type StrategyDebtInput } from './domain'

const debts: StrategyDebtInput[] = [
  { id: 'a', name: 'Tarjeta cara', balanceCents: 100_000, annualRateBps: 2000, monthlyPaymentCents: 10_000 },
  { id: 'b', name: 'Préstamo barato', balanceCents: 50_000, annualRateBps: 1000, monthlyPaymentCents: 10_000 },
]

describe('avalancheOrder', () => {
  it('ordena de mayor a menor tipo de interés', () => {
    expect(avalancheOrder(debts).map((d) => d.id)).toEqual(['a', 'b'])
  })
})

describe('snowballOrder', () => {
  it('ordena de menor a mayor saldo', () => {
    expect(snowballOrder(debts).map((d) => d.id)).toEqual(['b', 'a'])
  })
})

describe('compareDebtStrategies', () => {
  it('la avalancha prioriza la deuda de mayor interés, la bola de nieve la de menor saldo', () => {
    const { avalanche, snowball } = compareDebtStrategies(debts)
    expect(avalanche.order).toEqual(['Tarjeta cara', 'Préstamo barato'])
    expect(snowball.order).toEqual(['Préstamo barato', 'Tarjeta cara'])
  })

  it('la avalancha nunca paga más intereses totales que la bola de nieve', () => {
    const { avalanche, snowball } = compareDebtStrategies(debts)
    expect(avalanche.totalInterestCents).toBeLessThanOrEqual(snowball.totalInterestCents)
  })

  it('ambas estrategias liquidan por completo la misma deuda total (meses finitos)', () => {
    const { avalanche, snowball } = compareDebtStrategies(debts)
    expect(avalanche.totalMonths).toBeGreaterThan(0)
    expect(snowball.totalMonths).toBeGreaterThan(0)
    expect(Number.isFinite(avalanche.totalMonths)).toBe(true)
    expect(Number.isFinite(snowball.totalMonths)).toBe(true)
  })
})
