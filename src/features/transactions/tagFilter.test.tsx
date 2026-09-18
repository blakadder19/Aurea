import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { matchesTagFilter, TransactionsTable } from './TransactionsTable'
import { ALL_TAGS, useTransactionsStore } from './store'
import type { Transaction } from '../../data/transactions'

/**
 * Etiquetar sirve de poco si luego no puedes pedir "enséñame lo de esta
 * etiqueta". Esto cubre las dos formas de pedirlo: el desplegable y el chip.
 */

const tx = (id: string, comercio: string, tags: string[]): Transaction & { tags: string[] } => ({
  id,
  fecha: '15 sep',
  comercio,
  cuenta: 'Revolut',
  categoria: 'Viajes',
  importe: -20,
  tags,
})

const TRANSACTIONS = [
  tx('a', 'Alipay*govagency', ['viaje-china']),
  tx('b', 'Didi', ['viaje-china']),
  tx('c', 'Weixin*hotpot', ['viaje-china', 'comida']),
  tx('d', 'Mercadona', []),
  tx('e', 'Netflix', ['suscripciones']),
]

function renderTable() {
  return render(<TransactionsTable transactions={TRANSACTIONS} />)
}

/** Solo la tabla de escritorio: en móvil se repiten las mismas filas como tarjetas. */
function visibleMerchants(): string[] {
  const table = screen.getByRole('table')
  return within(table)
    .getAllByRole('button', { name: /^Editar movimiento de/ })
    .map((row) => row.getAttribute('aria-label')!.replace('Editar movimiento de ', ''))
}

describe('matchesTagFilter', () => {
  it('sin filtro, pasa todo', () => {
    expect(matchesTagFilter(TRANSACTIONS[3], ALL_TAGS)).toBe(true)
  })

  it('compara la etiqueta entera, no "contiene"', () => {
    // El buscador ya hace texto libre; este filtro es la respuesta precisa.
    expect(matchesTagFilter(TRANSACTIONS[0], 'viaje-china')).toBe(true)
    expect(matchesTagFilter(TRANSACTIONS[0], 'viaje')).toBe(false)
  })

  it('un movimiento con varias etiquetas entra por cualquiera de ellas', () => {
    expect(matchesTagFilter(TRANSACTIONS[2], 'viaje-china')).toBe(true)
    expect(matchesTagFilter(TRANSACTIONS[2], 'comida')).toBe(true)
  })

  it('un movimiento sin etiquetas no entra por ninguna', () => {
    expect(matchesTagFilter(TRANSACTIONS[3], 'viaje-china')).toBe(false)
  })
})

describe('filtrar la tabla por etiqueta', () => {
  afterEach(() => {
    useTransactionsStore.setState({ tagFilter: ALL_TAGS, searchQuery: '' })
  })

  it('sin filtro salen los cinco', () => {
    renderTable()
    expect(visibleMerchants()).toHaveLength(5)
  })

  it('con la etiqueta puesta salen solo los tres de esa etiqueta', () => {
    useTransactionsStore.setState({ tagFilter: 'viaje-china' })
    renderTable()
    expect(visibleMerchants()).toEqual(['Alipay*govagency', 'Didi', 'Weixin*hotpot'])
  })

  it('pulsar un chip aplica el filtro y deja los mismos tres', () => {
    renderTable()
    fireEvent.click(screen.getAllByRole('button', { name: 'Filtrar por la etiqueta viaje-china' })[0])

    expect(useTransactionsStore.getState().tagFilter).toBe('viaje-china')
    expect(visibleMerchants()).toEqual(['Alipay*govagency', 'Didi', 'Weixin*hotpot'])
  })

  it('volver a pulsar el chip activo quita el filtro', () => {
    // Desde una lista ya filtrada tiene que haber salida sin ir al desplegable.
    renderTable()
    fireEvent.click(screen.getAllByRole('button', { name: 'Filtrar por la etiqueta viaje-china' })[0])
    fireEvent.click(screen.getAllByRole('button', { name: 'Quitar el filtro de la etiqueta viaje-china' })[0])

    expect(useTransactionsStore.getState().tagFilter).toBe(ALL_TAGS)
    expect(visibleMerchants()).toHaveLength(5)
  })

  it('pulsar el chip no abre el panel de detalle de la fila', () => {
    renderTable()
    fireEvent.click(screen.getAllByRole('button', { name: 'Filtrar por la etiqueta viaje-china' })[0])
    expect(useTransactionsStore.getState().panelTransactionId).toBeNull()
  })
})
