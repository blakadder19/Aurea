import { fireEvent, render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { DebtsPage } from './DebtsPage'
import { useDebtsStore } from './store'

function renderPage() {
  return render(
    <BrowserRouter>
      <DebtsPage />
    </BrowserRouter>,
  )
}

function resetStore() {
  useDebtsStore.setState({ simulatorOpen: false })
}

describe('DebtsPage', () => {
  afterEach(resetStore)

  it('148.320 + 6.480 + 842,30 + 720 = 156.362,30 y se muestra en la cabecera', () => {
    renderPage()
    expect(screen.getByText('156.362,30 €')).toBeInTheDocument()
    expect(screen.getByText(/pendientes en 4 deudas/)).toBeInTheDocument()
    expect(screen.getByText('−148.320,00 €')).toBeInTheDocument()
    expect(screen.getByText('−6.480,00 €')).toBeInTheDocument()
    expect(screen.getByText('−842,30 €')).toBeInTheDocument()
    expect(screen.getByText('−720,00 €')).toBeInTheDocument()
  })

  it('la tarjeta enlaza a Pagos y suscripciones en vez de tener fecha de fin fija', () => {
    renderPage()
    expect(screen.getByRole('link', { name: 'Ver en Pagos y suscripciones' })).toHaveAttribute('href', '/pagos')
    expect(screen.getByText('Según uso')).toBeInTheDocument()
  })

  it('bola de nieve y avalancha no declaran ganadora y muestran las mismas cifras de partida', () => {
    renderPage()
    expect(screen.getByText('Bola de nieve o avalancha: mismos datos, distinto orden')).toBeInTheDocument()
    expect(screen.getAllByText('14 años y 2 meses')).toHaveLength(2)
    expect(screen.getByText('31.240 €')).toBeInTheDocument()
  })

  it('el simulador de pago extraordinario calcula intereses ahorrados y nueva fecha de fin', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Simular pago extraordinario' }))
    expect(screen.getByText('Resultado de la simulación')).toBeInTheDocument()
    expect(screen.getByText('Intereses que te ahorras')).toBeInTheDocument()
    expect(screen.getByText('Tiempo que adelantas')).toBeInTheDocument()
    expect(screen.getByText('Nueva fecha de fin')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }))
    expect(screen.queryByText('Resultado de la simulación')).not.toBeInTheDocument()
  })
})
