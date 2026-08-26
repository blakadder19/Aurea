import { describe, expect, it } from 'vitest'
import { computeEmergencyFund } from './useRealEmergencyFund'

describe('computeEmergencyFund', () => {
  it('calcula meses cubiertos y el objetivo de 6 meses de gasto', () => {
    const fund = computeEmergencyFund(6000, 1500)
    expect(fund.targetMonths).toBe(6)
    expect(fund.targetEuros).toBe(9000)
    expect(fund.monthsCovered).toBeCloseTo(4)
  })

  it('sin gasto medio (sin historial), no divide por cero', () => {
    const fund = computeEmergencyFund(6000, 0)
    expect(fund.monthsCovered).toBe(0)
    expect(fund.targetEuros).toBe(0)
  })

  it('ahorro que ya cubre de sobra el objetivo, meses cubiertos por encima de 6', () => {
    const fund = computeEmergencyFund(20000, 1000)
    expect(fund.monthsCovered).toBe(20)
  })
})
