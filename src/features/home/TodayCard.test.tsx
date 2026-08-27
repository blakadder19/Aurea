import { describe, expect, it } from 'vitest'
import { toActions } from './TodayCard'
import type { AttentionItem } from '../../data/demo'

function item(overrides: Partial<AttentionItem> & { headline: string }): AttentionItem {
  return {
    status: 'Requiere revisión',
    variant: 'danger',
    detail: '',
    actions: [],
    ...overrides,
  }
}

describe('toActions', () => {
  it('sin avisos, no hay botones', () => {
    expect(toActions([])).toEqual([])
  })

  it('usa la acción en imperativo, no el titular que solo nombra la cosa', () => {
    const actions = toActions([item({ headline: 'Gomo', actions: [{ label: 'Ver en Pagos y suscripciones', to: '/pagos' }] })])
    expect(actions).toEqual([{ label: 'Ver en Pagos y suscripciones', to: '/pagos' }])
  })

  it('junta varios avisos del mismo sitio en un botón con el número', () => {
    const actions = toActions([
      item({ headline: 'Gomo', actions: [{ label: 'Ver en Pagos y suscripciones', to: '/pagos' }] }),
      item({ headline: 'Tramyard Exchange Rent', actions: [{ label: 'Ver en Pagos y suscripciones', to: '/pagos' }] }),
      item({ headline: 'Instalment repayment', actions: [{ label: 'Ver en Pagos y suscripciones', to: '/pagos' }] }),
    ])
    expect(actions).toEqual([{ label: 'Ver en Pagos y suscripciones (3)', to: '/pagos' }])
  })

  it('mantiene separados los avisos que llevan a sitios distintos', () => {
    const actions = toActions([
      item({ headline: '2 movimientos sin categorizar', actions: [{ label: 'Abrir Centro de revisión', primary: true, to: '/movimientos' }] }),
      item({ headline: 'Gomo', actions: [{ label: 'Ver en Pagos y suscripciones', to: '/pagos' }] }),
    ])
    expect(actions.map((a) => a.to)).toEqual(['/movimientos', '/pagos'])
  })

  it('ignora los avisos que no llevan a ninguna parte (no serían un botón útil)', () => {
    expect(toActions([item({ headline: 'Algo informativo', actions: [{ label: 'Entendido' }] })])).toEqual([])
  })

  it('no muestra más de 4 botones, para que la cabecera no se convierta en una lista', () => {
    const many = ['/a', '/b', '/c', '/d', '/e', '/f'].map((to) => item({ headline: to, actions: [{ label: `Ir a ${to}`, to }] }))
    expect(toActions(many)).toHaveLength(4)
  })
})
