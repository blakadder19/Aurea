import { describe, expect, it } from 'vitest'
import { sharedTagsOf } from './sharedTags'
import type { Transaction, TransactionTag } from '../data/transactions'

const CHINA: TransactionTag = { id: 'tag-china', name: 'viaje-china', emoji: '🇨🇳', color: 'cat-3' }
const COMIDA: TransactionTag = { id: 'tag-comida', name: 'comida', emoji: null, color: 'cat-1' }
const TRABAJO: TransactionTag = { id: 'tag-trabajo', name: 'trabajo', emoji: null, color: 'cat-5' }

const tx = (id: string, tags: TransactionTag[]): Transaction => ({
  id,
  fecha: '15 sep',
  comercio: `Mov ${id}`,
  cuenta: 'Revolut',
  categoria: 'Viajes',
  importe: -20,
  tags,
})

describe('sharedTagsOf', () => {
  it('sin selección no hay nada que compartir', () => {
    expect(sharedTagsOf([tx('a', [CHINA])], [])).toEqual([])
  })

  it('las que llevan los tres', () => {
    const out = sharedTagsOf([tx('a', [CHINA, COMIDA]), tx('b', [CHINA, TRABAJO]), tx('c', [CHINA])], ['a', 'b', 'c'])
    expect(out).toEqual([CHINA])
  })

  it('si uno de los tres no la lleva, no se comparte', () => {
    const out = sharedTagsOf([tx('a', [CHINA]), tx('b', [CHINA]), tx('c', [])], ['a', 'b', 'c'])
    expect(out).toEqual([])
  })

  it('varias compartidas salen ordenadas por nombre', () => {
    const out = sharedTagsOf([tx('a', [TRABAJO, CHINA]), tx('b', [CHINA, TRABAJO])], ['a', 'b'])
    expect(out.map((t) => t.name)).toEqual(['trabajo', 'viaje-china'])
  })

  it('no se opina sobre movimientos que no están cargados', () => {
    // Afirmar que los tres comparten algo mirando solo dos sería inventar.
    const out = sharedTagsOf([tx('a', [CHINA]), tx('b', [CHINA])], ['a', 'b', 'c-que-no-esta'])
    expect(out).toEqual([])
  })

  it('los no seleccionados no cuentan', () => {
    const out = sharedTagsOf([tx('a', [CHINA]), tx('b', [CHINA]), tx('c', [])], ['a', 'b'])
    expect(out).toEqual([CHINA])
  })
})
