import { describe, expect, it } from 'vitest'
import { countsTowardCategorySpend, expenseContribution, incomeContribution } from './reimbursements'

describe('incomeContribution', () => {
  it('un abono normal suma entero', () => {
    expect(incomeContribution({ amountCents: 250000 })).toBe(250000)
  })

  it('un cargo no suma a ingresos', () => {
    expect(incomeContribution({ amountCents: -3000 })).toBe(0)
  })

  it('un traspaso entre cuentas propias no es ingreso', () => {
    expect(incomeContribution({ amountCents: 85000, isInternalTransfer: true })).toBe(0)
  })

  it('un reembolso no es ingreso', () => {
    expect(incomeContribution({ amountCents: 1200, isReimbursement: true })).toBe(0)
  })

  it('dar de alta un piso de 240.000 € no es ingresar 240.000 €', () => {
    expect(incomeContribution({ amountCents: 24_000_000, isBalanceAdjustment: true })).toBe(0)
  })
})

describe('expenseContribution', () => {
  it('un cargo normal suma en positivo', () => {
    expect(expenseContribution({ amountCents: -3000 })).toBe(3000)
  })

  it('un abono normal no suma a gastos', () => {
    expect(expenseContribution({ amountCents: 250000 })).toBe(0)
  })

  it('un traspaso entre cuentas propias no es gasto', () => {
    expect(expenseContribution({ amountCents: -85000, isInternalTransfer: true })).toBe(0)
  })

  it('un reembolso RESTA del gasto', () => {
    expect(expenseContribution({ amountCents: 1200, isReimbursement: true })).toBe(-1200)
  })

  it('una cena de 12 € reembolsada entera deja gasto neto 0', () => {
    const cena = expenseContribution({ amountCents: -1200 })
    const devolucion = expenseContribution({ amountCents: 1200, isReimbursement: true })
    expect(cena + devolucion).toBe(0)
  })

  it('una cena de 40 € a medias deja 20 € de gasto real', () => {
    const cena = expenseContribution({ amountCents: -4000 })
    const mitad = expenseContribution({ amountCents: 2000, isReimbursement: true })
    expect(cena + mitad).toBe(2000)
  })

  it('revalorizar un activo a la baja no es un gasto', () => {
    expect(expenseContribution({ amountCents: -500000, isBalanceAdjustment: true })).toBe(0)
  })
})

describe('countsTowardCategorySpend', () => {
  it('un cargo entra en el desglose por categoría', () => {
    expect(countsTowardCategorySpend({ amountCents: -3000 })).toBe(true)
  })

  it('un ingreso normal no entra (el desglose es de gasto)', () => {
    expect(countsTowardCategorySpend({ amountCents: 250000 })).toBe(false)
  })

  it('un reembolso sí entra, para poder restar de su categoría', () => {
    expect(countsTowardCategorySpend({ amountCents: 1200, isReimbursement: true })).toBe(true)
  })

  it('un traspaso nunca entra', () => {
    expect(countsTowardCategorySpend({ amountCents: -85000, isInternalTransfer: true })).toBe(false)
  })
})
