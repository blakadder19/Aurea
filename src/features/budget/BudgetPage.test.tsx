import { fireEvent, render, screen, within } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { BudgetPage } from './BudgetPage'
import { useBudgetStore } from './store'
import { budgetCategories } from '../../data/budget'

function renderPage() {
  return render(
    <BrowserRouter>
      <BudgetPage />
    </BrowserRouter>,
  )
}

function resetStore() {
  useBudgetStore.setState({
    mode: 'resumen',
    categoryBudgets: Object.fromEntries(budgetCategories.map((c) => [c.id, c.budgeted])),
    previousBudgets: null,
    panelOpen: false,
    savedMessage: null,
  })
}

describe('BudgetPage', () => {
  afterEach(resetStore)

  it('shows the conclusion headline and the five KPIs summing correctly', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Vas 145 € por encima del ritmo previsto' })).toBeInTheDocument()
    expect(screen.getByText('2.400 €')).toBeInTheDocument() // Presupuestado
    expect(screen.getByText('500 €')).toBeInTheDocument() // Restante = 2400 - 1612 - 288
  })

  it('Detalle adds the per-category explanation without duplicating blocks', () => {
    renderPage()
    expect(screen.queryByText('Ritmo esperado al día 19: 62 %. Vas alineada.')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Detalle' }))
    expect(screen.getByText('Ritmo esperado al día 19: 62 %. Vas alineada.')).toBeInTheDocument()
    expect(screen.getAllByText('Supermercado')).toHaveLength(1)
  })

  it('adjusting a category budget recalculates Presupuestado and Restante', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Ajustar presupuesto' }))
    const input = screen.getByLabelText('Presupuesto de Supermercado')
    fireEvent.change(input, { target: { value: '600' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    const restanteKpi = screen.getByText('Restante').parentElement!
    expect(within(restanteKpi).getByText('620 €')).toBeInTheDocument() // 500 + 120

    const presupuestadoKpi = screen.getByText('Presupuestado').parentElement!
    expect(within(presupuestadoKpi).getByText('2.520 €')).toBeInTheDocument() // 2400 + 120
  })
})
