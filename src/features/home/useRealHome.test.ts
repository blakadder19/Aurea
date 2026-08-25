import { describe, expect, it } from 'vitest'
import { computeSavingsRate } from './useRealHome'

describe('computeSavingsRate', () => {
  it('calcula (ingresos-gastos)/ingresos', () => {
    expect(computeSavingsRate(3000, 2100)).toBeCloseTo(30)
  })

  it('sin ingresos este mes, devuelve null en vez de fabricar una tasa', () => {
    expect(computeSavingsRate(0, 500)).toBeNull()
  })

  it('gastar más de lo que entra da una tasa negativa, no se oculta', () => {
    expect(computeSavingsRate(1000, 1500)).toBeCloseTo(-50)
  })
})
