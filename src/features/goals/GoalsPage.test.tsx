import { fireEvent, render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { GoalsPage } from './GoalsPage'
import { useGoalsStore } from './store'

function renderPage() {
  return render(
    <BrowserRouter>
      <GoalsPage />
    </BrowserRouter>,
  )
}

function resetStore() {
  useGoalsStore.setState({
    panelOpen: false,
    extraSaved: { emergencia: 0, japon: 0, reforma: 0 },
    lastAllocations: null,
    undoMessage: null,
  })
}

describe('GoalsPage', () => {
  afterEach(resetStore)

  it('shows the three figures matching PLAN.md and the emergency fund in months', () => {
    renderPage()
    expect(screen.getByText(/8\.900 €/)).toBeInTheDocument()
    expect(screen.getByText(/11\.880 €/)).toBeInTheDocument()
    expect(screen.getByText('2.150 €')).toBeInTheDocument()
    expect(screen.getByText('3.500 €')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Te faltan 1,5 meses de colchón/ })).toBeInTheDocument()
  })

  it('allocating a contribution updates the projected date live, before confirming', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar aportación' }))
    expect(screen.getByText('mar 2027 → feb 2027')).toBeInTheDocument()
    expect(screen.getByText('jun 2027 → may 2027')).toBeInTheDocument()
    // Aún no se ha confirmado: la tarjeta principal sigue con la fecha original.
    expect(screen.queryByText(/febrero de 2027/)).not.toBeInTheDocument()
  })

  it('confirming a contribution updates the goals and leaves an undo bar that reverts it', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar aportación' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar aportación' }))

    expect(screen.getByText('Aportación de 300,00 € registrada.')).toBeInTheDocument()
    expect(screen.getByText(/9\.100 €/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }))
    expect(screen.getByText(/8\.900 €/)).toBeInTheDocument()
    expect(screen.queryByText(/9\.100 €/)).not.toBeInTheDocument()
  })
})
