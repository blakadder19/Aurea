import { describe, expect, it } from 'vitest'
import { computeAvgDebtRate, computeMonthlyAverages, computeStartingNetWorth } from './useRealPlanning'
import type { Account } from '../../data/accounts'
import type { RealDebt } from '../debts/useRealDebts'

function account(overrides: Partial<Account>): Account {
  return {
    id: 'a1',
    name: 'Cuenta',
    institution: 'Banco',
    fn: 'Para gastar',
    balance: 0,
    countsInAvailableToday: true,
    recentMovements: [],
    ...overrides,
  }
}

describe('computeStartingNetWorth', () => {
  it('resta pasivos de activos, ponderando por sharePercent', () => {
    const accounts = [
      account({ id: '1', balance: 1000 }),
      account({ id: '2', balance: 2000, sharePercent: 50 }), // cuenta compartida: solo cuenta 1000
      account({ id: '3', balance: -500 }), // deuda
    ]
    expect(computeStartingNetWorth(accounts)).toBe(1000 + 1000 - 500)
  })

  it('excluye cuentas en divisa distinta de EUR', () => {
    const accounts = [account({ id: '1', balance: 1000 }), account({ id: '2', balance: 5000, currency: 'USD' })]
    expect(computeStartingNetWorth(accounts)).toBe(1000)
  })
})

describe('computeAvgDebtRate', () => {
  const debt = (overrides: Partial<RealDebt>): RealDebt => ({
    accountId: 'd1',
    name: 'Deuda',
    institution: 'Banco',
    balanceCents: 0,
    annualRateBps: 0,
    monthlyPaymentCents: null,
    nextPaymentDate: null,
    ...overrides,
  })

  it('pondera por saldo', () => {
    const debts = [debt({ balanceCents: 100_00, annualRateBps: 1000 }), debt({ balanceCents: 300_00, annualRateBps: 500 })]
    // (10000*0.10 + 30000*0.05) / 40000 = (1000+1500)/40000 = 0.0625
    expect(computeAvgDebtRate(debts)).toBeCloseTo(0.0625, 6)
  })

  it('sin deuda, devuelve 0 en vez de dividir por cero', () => {
    expect(computeAvgDebtRate([])).toBe(0)
  })
})

describe('computeMonthlyAverages', () => {
  it('promedia ingresos y gastos sobre los meses con movimientos', () => {
    const rows = [
      { amountCents: 300000, creditDebit: 'CRDT', dateISO: '2026-06-01' },
      { amountCents: -200000, creditDebit: 'DBIT', dateISO: '2026-06-15' },
      { amountCents: 300000, creditDebit: 'CRDT', dateISO: '2026-07-01' },
      { amountCents: -220000, creditDebit: 'DBIT', dateISO: '2026-07-15' },
    ]
    const { ingresos, gastos } = computeMonthlyAverages(rows)
    expect(ingresos).toBeCloseTo(3000, 2)
    expect(gastos).toBeCloseTo(2100, 2)
  })

  it('sin movimientos, devuelve 0 sin dividir por cero', () => {
    expect(computeMonthlyAverages([])).toEqual({ ingresos: 0, gastos: 0 })
  })
})
