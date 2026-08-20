import { fireEvent, render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { PlanningPage } from './PlanningPage'
import { usePlanningStore } from './store'
import { BASE_SCENARIO, DEFAULT_HORIZON, DEFAULT_WITHDRAWAL_RATE } from '../../data/planning'

function renderPage() {
  return render(
    <BrowserRouter>
      <PlanningPage />
    </BrowserRouter>,
  )
}

function resetStore() {
  usePlanningStore.setState({ params: { ...BASE_SCENARIO }, horizonYears: DEFAULT_HORIZON, withdrawalRate: DEFAULT_WITHDRAWAL_RATE })
}

describe('PlanningPage', () => {
  afterEach(resetStore)

  it('la etiqueta Simulación es visible en la cabecera sin hacer scroll', () => {
    renderPage()
    expect(screen.getAllByText('Simulación').length).toBeGreaterThan(0)
    expect(screen.getByText('Planificación')).toBeInTheDocument()
  })

  it('con los valores por defecto, este escenario y el escenario base coinciden', () => {
    renderPage()
    const values = screen.getAllByText('426.623 €')
    expect(values.length).toBe(3) // gráfico (este + base) + tarjeta «Base»
  })

  it('mover un control actualiza el gráfico y las cifras en vivo', () => {
    renderPage()
    const rentabilidad = screen.getByLabelText(/Rentabilidad anual esperada/)
    fireEvent.change(rentabilidad, { target: { value: '7' } })
    expect(screen.getByText('7,0 %')).toBeInTheDocument()
    expect(screen.getAllByText('487.293 €').length).toBeGreaterThan(0)
  })

  it('la tasa de retirada es editable y mueve el capital objetivo en vivo', () => {
    renderPage()
    expect(screen.getByText('720.000 €')).toBeInTheDocument()
    const tasaInput = screen.getByLabelText('Tasa de retirada anual')
    fireEvent.change(tasaInput, { target: { value: '3' } })
    expect(screen.getByText('960.000 €')).toBeInTheDocument()
  })
})
