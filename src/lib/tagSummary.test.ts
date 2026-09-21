import { describe, expect, it } from 'vitest'
import { buildTagSummary, type TagSummaryInput } from './tagSummary'

const SIN_POCKET = { eur: new Map<string, number>(), unc: new Map<string, number>() }

const tx = (o: Partial<TagSummaryInput> & { id: string; importe: number }): TagSummaryInput => ({
  categoria: 'Restaurantes',
  currency: 'EUR',
  dateISO: '2026-09-14',
  ...o,
})

describe('buildTagSummary', () => {
  it('sin movimientos, todo a cero', () => {
    const s = buildTagSummary([], SIN_POCKET.eur, SIN_POCKET.unc)
    expect(s.totalCents).toBe(0)
    expect(s.movementCount).toBe(0)
    expect(s.byCategory).toEqual([])
  })

  it('suma el gasto y lo reparte por categoría, de mayor a menor', () => {
    const s = buildTagSummary(
      [
        tx({ id: 'a', importe: -20, categoria: 'Restaurantes' }),
        tx({ id: 'b', importe: -30, categoria: 'Transporte' }),
        tx({ id: 'c', importe: -10, categoria: 'Restaurantes' }),
      ],
      SIN_POCKET.eur,
      SIN_POCKET.unc,
    )
    expect(s.totalCents).toBe(6000)
    expect(s.movementCount).toBe(3)
    expect(s.byCategory).toEqual([
      { categoria: 'Restaurantes', cents: 3000, share: 50 },
      { categoria: 'Transporte', cents: 3000, share: 50 },
    ])
  })

  it('el reparto ordena por importe, no por nombre', () => {
    const s = buildTagSummary(
      [tx({ id: 'a', importe: -10, categoria: 'Restaurantes' }), tx({ id: 'b', importe: -90, categoria: 'Transporte' })],
      SIN_POCKET.eur,
      SIN_POCKET.unc,
    )
    expect(s.byCategory.map((r) => r.categoria)).toEqual(['Transporte', 'Restaurantes'])
    expect(s.byCategory[0].share).toBe(90)
  })

  it('da el rango de fechas, que es lo que hace que se lea como un viaje', () => {
    const s = buildTagSummary(
      [
        tx({ id: 'a', importe: -10, dateISO: '2026-09-16' }),
        tx({ id: 'b', importe: -10, dateISO: '2026-09-12' }),
        tx({ id: 'c', importe: -10, dateISO: '2026-09-14' }),
      ],
      SIN_POCKET.eur,
      SIN_POCKET.unc,
    )
    expect(s.fromISO).toBe('2026-09-12')
    expect(s.toISO).toBe('2026-09-16')
  })

  it('un traspaso entre cuentas propias no es gasto del viaje', () => {
    const s = buildTagSummary(
      [tx({ id: 'a', importe: -20 }), tx({ id: 'b', importe: -100, isInternalTransfer: true })],
      SIN_POCKET.eur,
      SIN_POCKET.unc,
    )
    expect(s.totalCents).toBe(2000)
    expect(s.movementCount).toBe(1)
  })

  it('un reembolso resta del total', () => {
    const s = buildTagSummary(
      [tx({ id: 'a', importe: -50, categoria: 'Restaurantes' }), tx({ id: 'b', importe: 20, categoria: 'Restaurantes', isReimbursement: true })],
      SIN_POCKET.eur,
      SIN_POCKET.unc,
    )
    expect(s.totalCents).toBe(3000)
  })

  it('un ingreso normal no suma como gasto', () => {
    const s = buildTagSummary([tx({ id: 'a', importe: -20 }), tx({ id: 'b', importe: 500 })], SIN_POCKET.eur, SIN_POCKET.unc)
    expect(s.totalCents).toBe(2000)
    expect(s.movementCount).toBe(1)
  })

  // Lo del pocket: mezclar divisas a pelo daría una cifra sin significado ----

  it('el gasto en otra divisa entra por su euro de FIFO, no por su cifra', () => {
    // 200,00 zł que costaron 46,63 €.
    const s = buildTagSummary(
      [tx({ id: 'pln', importe: -200, currency: 'PLN', categoria: 'Restaurantes' })],
      new Map([['pln', 4663]]),
      new Map(),
    )
    expect(s.totalCents).toBe(4663)
    expect(s.uncovered).toEqual([])
  })

  it('lo que FIFO no puede respaldar queda fuera del total y se reporta aparte', () => {
    const s = buildTagSummary(
      [tx({ id: 'gbp', importe: -9.99, currency: 'GBP' })],
      new Map(),
      new Map([['gbp', 999]]),
    )
    expect(s.totalCents).toBe(0)
    expect(s.uncovered).toEqual([{ currency: 'GBP', cents: 999 }])
    // Sigue contando como movimiento del viaje: existió aunque no sepamos su euro.
    expect(s.movementCount).toBe(1)
  })

  it('euros y pocket en el mismo viaje se suman en euros', () => {
    const s = buildTagSummary(
      [tx({ id: 'eur', importe: -50, categoria: 'Transporte' }), tx({ id: 'pln', importe: -200, currency: 'PLN', categoria: 'Restaurantes' })],
      new Map([['pln', 4663]]),
      new Map(),
    )
    expect(s.totalCents).toBe(9663)
    expect(s.byCategory).toEqual([
      { categoria: 'Transporte', cents: 5000, share: (5000 / 9663) * 100 },
      { categoria: 'Restaurantes', cents: 4663, share: (4663 / 9663) * 100 },
    ])
  })
})
