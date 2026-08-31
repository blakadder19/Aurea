import { describe, expect, it } from 'vitest'
import type { Transaction } from '../../data/transactions'
import { groupByMonth } from './groupByMonth'

function tx(dateISO: string | null, importe: number, id = `${dateISO}-${importe}`): Transaction {
  return { id, fecha: '', comercio: 'X', cuenta: 'Y', categoria: 'Z', importe, dateISO } as Transaction
}

describe('groupByMonth', () => {
  it('sin movimientos, no hay grupos', () => {
    expect(groupByMonth([])).toEqual([])
  })

  it('agrupa por mes y pone la etiqueta en castellano', () => {
    const groups = groupByMonth([tx('2026-08-20', -10), tx('2026-08-02', -5), tx('2026-07-30', -3)])
    expect(groups.map((g) => g.label)).toEqual(['agosto de 2026', 'julio de 2026'])
    expect(groups[0].transactions).toHaveLength(2)
    expect(groups[1].transactions).toHaveLength(1)
  })

  it('suma solo los cargos: el interés del mes es cuánto salió', () => {
    const groups = groupByMonth([tx('2026-08-20', -10), tx('2026-08-21', 250), tx('2026-08-22', -5)])
    expect(groups[0].spent).toBe(15)
  })

  it('respeta el orden de entrada en vez de reordenar por su cuenta', () => {
    // La tabla ya llega ordenada; si aquí se reordenara, se rompería el filtrado.
    const groups = groupByMonth([tx('2026-07-01', -1), tx('2026-08-01', -1)])
    expect(groups.map((g) => g.key)).toEqual(['2026-07', '2026-08'])
  })

  it('los movimientos sin fecha (demo) van juntos y sin cabecera inventada', () => {
    const groups = groupByMonth([tx(null, -10, 'a'), tx(null, -5, 'b')])
    expect(groups).toHaveLength(1)
    expect(groups[0].label).toBe('')
    expect(groups[0].transactions).toHaveLength(2)
  })

  it('no mezcla el mismo mes de años distintos', () => {
    const groups = groupByMonth([tx('2026-08-01', -1), tx('2025-08-01', -1)])
    expect(groups.map((g) => g.label)).toEqual(['agosto de 2026', 'agosto de 2025'])
  })
})
