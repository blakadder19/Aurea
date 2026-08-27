import { describe, expect, it } from 'vitest'
import { buildTodayHeadline } from './todayCalc'

const base = { availableToday: 0, eligibleAccountsSum: 0, commitments14d: 0, monthExpense: 0 }

describe('buildTodayHeadline', () => {
  it('sin cuentas ni pagos, lo dice en vez de fingir un veredicto', () => {
    const result = buildTodayHeadline(base)
    expect(result.tone).toBe('sin-datos')
    expect(result.headline).toMatch(/no hay suficiente/i)
  })

  it('con margen negativo, avisa de cuánto falta', () => {
    const result = buildTodayHeadline({ ...base, availableToday: -785, eligibleAccountsSum: 2706, commitments14d: 2692 })
    expect(result.tone).toBe('apretado')
    expect(result.detail).toContain('785 €')
    expect(result.detail).toContain('2.692 €')
  })

  it('con poco colchón sobre lo comprometido, avisa de que va justo', () => {
    const result = buildTodayHeadline({ ...base, availableToday: 100, eligibleAccountsSum: 2800, commitments14d: 2692 })
    expect(result.tone).toBe('justo')
  })

  it('con colchón amplio, dice que va bien e incluye lo gastado', () => {
    const result = buildTodayHeadline({ ...base, availableToday: 2000, eligibleAccountsSum: 4000, commitments14d: 500, monthExpense: 1200 })
    expect(result.tone).toBe('holgado')
    expect(result.detail).toContain('1.200 €')
  })

  it('el tono es relativo a lo comprometido, no un umbral fijo en euros', () => {
    // 200 € de margen: holgado si salen 300, justo si salen 3.000.
    expect(buildTodayHeadline({ ...base, availableToday: 200, eligibleAccountsSum: 500, commitments14d: 300 }).tone).toBe('holgado')
    expect(buildTodayHeadline({ ...base, availableToday: 200, eligibleAccountsSum: 3200, commitments14d: 3000 }).tone).toBe('justo')
  })

  it('sin pagos comprometidos pero con saldo, no divide por cero', () => {
    const result = buildTodayHeadline({ ...base, availableToday: 1500, eligibleAccountsSum: 1500, commitments14d: 0 })
    expect(result.tone).toBe('holgado')
  })
})
