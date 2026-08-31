import { describe, expect, it } from 'vitest'
import { buildAccountLabels, type AccountLabelSource } from './accountLabels'

function account(overrides: Partial<AccountLabelSource> & { id: string }): AccountLabelSource {
  return { name: 'Alejandro López', institution: 'Revolut', currency: 'EUR', ...overrides }
}

describe('buildAccountLabels', () => {
  it('sin cuentas, no hay etiquetas', () => {
    expect(buildAccountLabels([])).toEqual(new Map())
  })

  it('con una sola cuenta por banco, no ensucia con la divisa', () => {
    const labels = buildAccountLabels([account({ id: 'a' })])
    expect(labels.get('a')).toBe('Alejandro López · Revolut')
  })

  it('cuando dos cuentas se llamarían igual, las desempata por divisa', () => {
    const labels = buildAccountLabels([
      account({ id: 'eur', currency: 'EUR' }),
      account({ id: 'gbp', currency: 'GBP' }),
    ])
    expect(labels.get('eur')).toBe('Alejandro López · Revolut · EUR')
    expect(labels.get('gbp')).toBe('Alejandro López · Revolut · GBP')
  })

  it('solo desempata las que chocan, no todas', () => {
    const labels = buildAccountLabels([
      account({ id: 'eur', currency: 'EUR' }),
      account({ id: 'gbp', currency: 'GBP' }),
      account({ id: 'conjunta', name: 'Cuenta conjunta', currency: 'EUR' }),
    ])
    expect(labels.get('eur')).toBe('Alejandro López · Revolut · EUR')
    expect(labels.get('conjunta')).toBe('Cuenta conjunta · Revolut')
  })

  it('el mismo nombre en bancos distintos no choca: el banco ya las distingue', () => {
    const labels = buildAccountLabels([
      account({ id: 'a', institution: 'Revolut' }),
      account({ id: 'b', institution: 'Openbank' }),
    ])
    expect(labels.get('a')).toBe('Alejandro López · Revolut')
    expect(labels.get('b')).toBe('Alejandro López · Openbank')
  })

  it('si chocan y no hay divisa, deja la etiqueta base en vez de inventarse un sufijo', () => {
    const labels = buildAccountLabels([account({ id: 'a', currency: null }), account({ id: 'b', currency: null })])
    expect(labels.get('a')).toBe('Alejandro López · Revolut')
    expect(labels.get('b')).toBe('Alejandro López · Revolut')
  })
})
