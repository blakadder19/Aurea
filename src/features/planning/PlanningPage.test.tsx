import { fireEvent, render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { PlanningPage } from './PlanningPage'
import { usePlanningStore } from './store'
import {
  ASSUMED_CURRENT_AGE,
  AVG_DEBT_RATE,
  BASE_SCENARIO,
  DEFAULT_HORIZON,
  DEFAULT_WITHDRAWAL_RATE,
  STARTING_NET_WORTH,
} from '../../data/planning'
import { CONTEXT_DATE } from '../../data/demo'

function renderPage() {
  return render(
    <BrowserRouter>
      <PlanningPage />
    </BrowserRouter>,
  )
}

function resetStore() {
  usePlanningStore.setState({
    params: { ...BASE_SCENARIO },
    horizonYears: DEFAULT_HORIZON,
    withdrawalRate: DEFAULT_WITHDRAWAL_RATE,
    startingNetWorth: STARTING_NET_WORTH,
    avgDebtRate: AVG_DEBT_RATE,
    baseParams: { ...BASE_SCENARIO },
    currentAge: ASSUMED_CURRENT_AGE,
    today: CONTEXT_DATE,
  })
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
    const rentabilidad = screen.getByRole('slider', { name: 'Rentabilidad anual esperada' })
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

  it('el campo numérico de un slider acepta un valor por encima de su tope visual', () => {
    renderPage()
    const aportacionInput = screen.getByLabelText('Aportación a inversión (valor exacto)')
    fireEvent.change(aportacionInput, { target: { value: '2500' } })
    expect(screen.getByText('2.500 €/mes')).toBeInTheDocument()
    const aportacionSlider = screen.getByRole('slider', { name: 'Aportación a inversión' })
    expect(aportacionSlider).toHaveValue('1000') // el slider se satura en su tope, el valor real no
  })
})
