import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ReportsPage } from './ReportsPage'
import { useTransactionsStore } from '../transactions/store'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/informes']}>
      <Routes>
        <Route path="/informes" element={<ReportsPage />} />
        <Route path="/movimientos" element={<div>Página de movimientos</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

/** El informe por defecto muestra el mes cerrado más reciente (monthsAgo=1) — nunca una fecha fija. */
function lastClosedMonthIso(): string {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

describe('ReportsPage (demo)', () => {
  it('muestra el desglose por comercio del informe de ejemplo', () => {
    renderPage()
    expect(screen.getByText('Por comercio')).toBeInTheDocument()
    expect(screen.getByText('Mercadona')).toBeInTheDocument()
  })

  it('"Ver movimientos" de una categoría navega a Movimientos con esa categoría y ese mes preseleccionados', () => {
    renderPage()
    const categoryRow = screen.getByText('Hogar y facturas').closest('div')!.parentElement!
    fireEvent.click(within(categoryRow).getByRole('button', { name: 'Ver' }))

    expect(screen.getByText('Página de movimientos')).toBeInTheDocument()
    expect(useTransactionsStore.getState().categoryFilter).toBe('Hogar y facturas')
    expect(useTransactionsStore.getState().dateFilter).toBe(lastClosedMonthIso())
  })
})
