import { fireEvent, render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { AccountsPage } from './AccountsPage'
import { useAccountsStore } from './store'

function renderPage() {
  return render(
    <BrowserRouter>
      <AccountsPage />
    </BrowserRouter>,
  )
}

function resetStore() {
  useAccountsStore.setState({ mode: 'resumen', panelAccountId: null })
}

describe('AccountsPage', () => {
  afterEach(resetStore)

  it('shows the three net worth KPIs, all eleven accounts, and Revolut in USD', () => {
    renderPage()
    expect(screen.getByText('344.526,57 €')).toBeInTheDocument() // Activos
    expect(screen.getByText('188.164,27 €')).toBeInTheDocument() // Patrimonio neto
    // Cada fila de cuenta expone role="button" (para el click/Enter), no "row".
    expect(screen.getAllByRole('button', { name: /^Ver detalle de/ })).toHaveLength(11)
    expect(screen.getByText(/1860,00 USD/)).toBeInTheDocument()
    expect(screen.getByText(/tipo 0,9180/)).toBeInTheDocument()
  })

  it('clicking a row opens the detail panel with that account, and Detalle adds the two breakdowns', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Ver detalle de Revolut' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Revolut' })).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Cerrar panel'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    expect(screen.queryByText('Por clase de activo')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Detalle' }))
    expect(screen.getByText('Por clase de activo')).toBeInTheDocument()
    expect(screen.getByText('Por institución')).toBeInTheDocument()
  })
})
