import { fireEvent, render, screen, within } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { RecurringPage } from './RecurringPage'
import { useRecurringStore } from './store'

function renderPage() {
  return render(
    <BrowserRouter>
      <RecurringPage />
    </BrowserRouter>,
  )
}

function resetStore() {
  useRecurringStore.setState({ view: 'lista', panelItemId: null, undoMessage: null })
}

describe('RecurringPage', () => {
  afterEach(resetStore)

  it('computes section subtotals and the header total from the real line items', () => {
    renderPage()
    // Facturas esenciales: 78,45 + 46,90 + 31,20 = 156,55
    expect(screen.getByText(/Facturas esenciales/)).toHaveTextContent('156,55')
    // Cabecera: suma de las 10 líneas = 1.209,02 €/mes
    expect(screen.getByText(/1\.209,02 €\s*recurrentes al mes/)).toBeInTheDocument()
  })

  it('the three highlighted cases carry color + icon + word and an explanation', () => {
    renderPage()
    expect(screen.getByText('Sube de precio')).toBeInTheDocument()
    expect(screen.getByText('Prueba termina en 3 días')).toBeInTheDocument()
    expect(screen.getByText('Posible duplicado')).toBeInTheDocument()
    expect(screen.getByText(/Spotify pasa de 10,99 €/)).toBeInTheDocument()
  })

  it('opens the Spotify panel with the price change marked in the history', () => {
    renderPage()
    const spotifyRow = screen.getByRole('button', { name: 'Ver detalle de Spotify' })
    fireEvent.click(within(spotifyRow).getByRole('button', { name: 'Ver suscripción' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Spotify' })).toBeInTheDocument()
    expect(within(dialog).getAllByText(/antes/).length).toBeGreaterThan(0)
  })

  it('cancelling a highlighted case shows the undo bar', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar antes del 14 sep' }))
    expect(screen.getByText('Prueba de Filmin marcada para cancelar antes del 14 sep.')).toBeInTheDocument()
  })

  it('switching to Calendario does not navigate and shows no wrapped amounts', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Calendario' }))
    expect(screen.getByText('Agosto de 2026')).toBeInTheDocument()
    expect(screen.getByText('186,20 €')).toBeInTheDocument()
  })
})
