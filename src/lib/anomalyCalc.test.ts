import { describe, expect, it } from 'vitest'
import { findPossibleDuplicates, findUnusualAmounts } from './anomalyCalc'

describe('findPossibleDuplicates', () => {
  it('detecta el mismo comercio e importe a 1 día de distancia', () => {
    const flags = findPossibleDuplicates([
      { id: 't1', comercio: 'Restaurante X', importe: -45, dateISO: '2026-08-24' },
      { id: 't2', comercio: 'Restaurante X', importe: -45, dateISO: '2026-08-25' },
    ])
    expect(flags).toHaveLength(1)
    expect(flags[0]).toMatchObject({ transactionId: 't1', matchedTransactionId: 't2', importeAbs: 45, daysApart: 1 })
  })

  it('no marca si el importe es distinto, aunque el comercio y la fecha coincidan', () => {
    const flags = findPossibleDuplicates([
      { id: 't1', comercio: 'Restaurante X', importe: -45, dateISO: '2026-08-25' },
      { id: 't2', comercio: 'Restaurante X', importe: -12, dateISO: '2026-08-25' },
    ])
    expect(flags).toHaveLength(0)
  })

  it('no marca si están a más días de distancia del límite', () => {
    const flags = findPossibleDuplicates(
      [
        { id: 't1', comercio: 'Restaurante X', importe: -45, dateISO: '2026-08-01' },
        { id: 't2', comercio: 'Restaurante X', importe: -45, dateISO: '2026-08-25' },
      ],
      3,
    )
    expect(flags).toHaveLength(0)
  })

  it('ignora ingresos (importe positivo)', () => {
    const flags = findPossibleDuplicates([
      { id: 't1', comercio: 'Nómina', importe: 2000, dateISO: '2026-08-25' },
      { id: 't2', comercio: 'Nómina', importe: 2000, dateISO: '2026-08-25' },
    ])
    expect(flags).toHaveLength(0)
  })

  it('no duplica el mismo par al recorrerlo dos veces', () => {
    const flags = findPossibleDuplicates([
      { id: 't1', comercio: 'Restaurante X', importe: -45, dateISO: '2026-08-25' },
      { id: 't2', comercio: 'Restaurante X', importe: -45, dateISO: '2026-08-25' },
      { id: 't3', comercio: 'Restaurante X', importe: -45, dateISO: '2026-08-26' },
    ])
    expect(flags).toHaveLength(3) // t1-t2, t1-t3, t2-t3 — pares distintos, no duplicados
    const pairs = flags.map((f) => [f.transactionId, f.matchedTransactionId].sort().join('|'))
    expect(new Set(pairs).size).toBe(3)
  })
})

describe('findUnusualAmounts', () => {
  it('marca un cargo muy por encima de la mediana de ese comercio', () => {
    const flags = findUnusualAmounts([
      { id: 't1', comercio: 'Super', importe: -20, dateISO: '2026-08-01' },
      { id: 't2', comercio: 'Super', importe: -22, dateISO: '2026-08-08' },
      { id: 't3', comercio: 'Super', importe: -21, dateISO: '2026-08-15' },
      { id: 't4', comercio: 'Super', importe: -80, dateISO: '2026-08-22' },
    ])
    expect(flags).toHaveLength(1)
    expect(flags[0]).toMatchObject({ transactionId: 't4', comercio: 'Super', importeAbs: 80 })
  })

  it('no marca nada si el comercio no tiene suficiente historial (mínimo 3 por defecto)', () => {
    const flags = findUnusualAmounts([
      { id: 't1', comercio: 'Super', importe: -20, dateISO: '2026-08-01' },
      { id: 't2', comercio: 'Super', importe: -80, dateISO: '2026-08-08' },
    ])
    expect(flags).toHaveLength(0)
  })

  it('no marca nada si todos los importes son parecidos', () => {
    const flags = findUnusualAmounts([
      { id: 't1', comercio: 'Super', importe: -20, dateISO: '2026-08-01' },
      { id: 't2', comercio: 'Super', importe: -22, dateISO: '2026-08-08' },
      { id: 't3', comercio: 'Super', importe: -21, dateISO: '2026-08-15' },
    ])
    expect(flags).toHaveLength(0)
  })

  it('compara cada comercio con su propia mediana, no con la de otros comercios', () => {
    const flags = findUnusualAmounts([
      { id: 't1', comercio: 'Restaurante caro', importe: -80, dateISO: '2026-08-01' },
      { id: 't2', comercio: 'Restaurante caro', importe: -85, dateISO: '2026-08-08' },
      { id: 't3', comercio: 'Restaurante caro', importe: -82, dateISO: '2026-08-15' },
      { id: 't4', comercio: 'Super', importe: -20, dateISO: '2026-08-01' },
      { id: 't5', comercio: 'Super', importe: -22, dateISO: '2026-08-08' },
      { id: 't6', comercio: 'Super', importe: -21, dateISO: '2026-08-15' },
    ])
    expect(flags).toHaveLength(0)
  })
})
