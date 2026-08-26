import { describe, expect, it } from 'vitest'
import type { Transaction } from '../../data/transactions'
import { DATE_ALL, DATE_LAST_3_MONTHS, DATE_THIS_MONTH } from './store'
import { displayLabelFor, matchesDateFilter, matchesSearch } from './TransactionsTable'

function tx(overrides: Partial<Transaction>): Transaction {
  return { id: 't1', fecha: '25 ago', comercio: 'Mercadona', cuenta: 'Revolut', categoria: 'Supermercado', importe: -62.18, ...overrides }
}

/** Como una RealTransaction (con dateISO), pero solo se necesita ese campo para probar matchesDateFilter. */
function txWithDate(dateISO: string | null): Transaction {
  return { ...tx({}), dateISO } as Transaction
}

function isoMonthsAgo(monthsBack: number, day = 15): string {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() - monthsBack, day)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('matchesSearch', () => {
  it('sin búsqueda, coincide con cualquier movimiento', () => {
    expect(matchesSearch(tx({}), '')).toBe(true)
  })

  it('busca por comercio', () => {
    expect(matchesSearch(tx({ comercio: 'Mercadona' }), 'merca')).toBe(true)
    expect(matchesSearch(tx({ comercio: 'Mercadona' }), 'netflix')).toBe(false)
  })

  it('busca por importe, sin importar el signo ni si escribes coma o el símbolo €', () => {
    expect(matchesSearch(tx({ importe: -62.18 }), '62,18')).toBe(true)
    expect(matchesSearch(tx({ importe: 62.18 }), '62,18')).toBe(true)
    expect(matchesSearch(tx({ importe: -62.18 }), '62,18 €')).toBe(true)
  })

  it('busca por nota real (userNote)', () => {
    expect(matchesSearch(tx({ userNote: 'Regalo de cumpleaños' }), 'regalo')).toBe(true)
    expect(matchesSearch(tx({ userNote: 'Regalo de cumpleaños' }), 'factura')).toBe(false)
  })

  it('busca por etiqueta', () => {
    expect(matchesSearch(tx({ tags: ['Vacaciones2026', 'Compartido'] }), 'vacaciones')).toBe(true)
    expect(matchesSearch(tx({ tags: ['Vacaciones2026'] }), 'trabajo')).toBe(false)
  })

  it('sin nota ni etiquetas (demo), no revienta y simplemente no coincide por ahí', () => {
    expect(matchesSearch(tx({}), 'algo')).toBe(false)
  })

  it('busca también por el nombre personal (displayName)', () => {
    expect(matchesSearch(tx({ comercio: 'Deliveroo', displayName: 'Cena viernes' }), 'cena')).toBe(true)
  })
})

describe('matchesDateFilter', () => {
  it('con "Todo", coincide siempre, incluso sin dateISO (demo)', () => {
    expect(matchesDateFilter(tx({}), DATE_ALL)).toBe(true)
    expect(matchesDateFilter(txWithDate(null), DATE_ALL)).toBe(true)
  })

  it('sin dateISO (demo), nunca se oculta por fecha aunque el filtro no sea "Todo"', () => {
    expect(matchesDateFilter(tx({}), DATE_THIS_MONTH)).toBe(true)
    expect(matchesDateFilter(tx({}), DATE_LAST_3_MONTHS)).toBe(true)
  })

  it('"Este mes" excluye movimientos de meses anteriores', () => {
    expect(matchesDateFilter(txWithDate(isoMonthsAgo(0)), DATE_THIS_MONTH)).toBe(true)
    expect(matchesDateFilter(txWithDate(isoMonthsAgo(1)), DATE_THIS_MONTH)).toBe(false)
  })

  it('"Últimos 3 meses" incluye el mes actual y los dos anteriores, no el cuarto', () => {
    expect(matchesDateFilter(txWithDate(isoMonthsAgo(0)), DATE_LAST_3_MONTHS)).toBe(true)
    expect(matchesDateFilter(txWithDate(isoMonthsAgo(2)), DATE_LAST_3_MONTHS)).toBe(true)
    expect(matchesDateFilter(txWithDate(isoMonthsAgo(3)), DATE_LAST_3_MONTHS)).toBe(false)
  })
})

describe('displayLabelFor', () => {
  it('usa el nombre personal cuando existe', () => {
    expect(displayLabelFor(tx({ comercio: 'Deliveroo', displayName: 'Cena viernes' }))).toBe('Cena viernes')
  })

  it('usa el comercio del banco cuando no hay nombre personal', () => {
    expect(displayLabelFor(tx({ comercio: 'Deliveroo', displayName: null }))).toBe('Deliveroo')
    expect(displayLabelFor(tx({ comercio: 'Deliveroo' }))).toBe('Deliveroo')
  })
})
