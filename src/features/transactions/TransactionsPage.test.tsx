import { fireEvent, render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { TransactionsPage } from './TransactionsPage'
import { useTransactionsStore } from './store'
import { defaultSelectedIds, initialReviewItems } from '../../data/transactions'

function renderPage() {
  return render(
    <BrowserRouter>
      <TransactionsPage />
    </BrowserRouter>,
  )
}

function resetStore() {
  useTransactionsStore.setState({
    view: 'tabla',
    searchQuery: '',
    selectedIds: new Set(defaultSelectedIds),
    panelTransactionId: null,
    reviewItems: initialReviewItems,
    undoMessage: null,
  })
}

describe('TransactionsPage', () => {
  afterEach(resetStore)

  it('renders the Movimientos heading and the default selection', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Movimientos' })).toBeInTheDocument()
    expect(screen.getByText('2 movimientos seleccionados')).toBeInTheDocument()
  })

  it('filters the table live by comercio', () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('Buscar movimientos'), { target: { value: 'zara' } })
    expect(screen.getByText('Zara · devolución')).toBeInTheDocument()
    expect(screen.queryByText('Mercadona')).not.toBeInTheDocument()
  })

  it('resolving a review card lowers the counter', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Centro de revisión (4)' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Confirmar' })[0])
    expect(screen.getByRole('button', { name: 'Centro de revisión (3)' })).toBeInTheDocument()
  })
})
