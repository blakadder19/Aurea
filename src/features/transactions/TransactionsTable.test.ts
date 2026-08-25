import { describe, expect, it } from 'vitest'
import type { Transaction } from '../../data/transactions'
import { matchesSearch } from './TransactionsTable'

function tx(overrides: Partial<Transaction>): Transaction {
  return { id: 't1', fecha: '25 ago', comercio: 'Mercadona', cuenta: 'Revolut', categoria: 'Supermercado', importe: -62.18, ...overrides }
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
})
