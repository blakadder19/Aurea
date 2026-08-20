import { fireEvent, render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { InvestmentsPage } from './InvestmentsPage'
import { useInvestmentsStore } from './store'

function renderPage() {
  return render(
    <BrowserRouter>
      <InvestmentsPage />
    </BrowserRouter>,
  )
}

function resetStore() {
  useInvestmentsStore.setState({ mode: 'resumen' })
}

describe('InvestmentsPage', () => {
  afterEach(resetStore)

  it('32.400 + 6.520 = 38.920 y la rentabilidad cuadra con esas cifras', () => {
    renderPage()
    expect(screen.getAllByText('38.920,00 €').length).toBeGreaterThan(0) // Valor actual (+ posición)
    expect(screen.getByText('32.400,00 €')).toBeInTheDocument() // Aportado
    expect(screen.getAllByText('+6.520,00 €').length).toBeGreaterThan(0) // Rendimiento (+ posición)
    expect(screen.getAllByText('+20,1 %').length).toBeGreaterThan(0) // Rentabilidad (+ posición)
  })

  it('la etiqueta de cotizaciones simuladas es visible, con hora, no en letra pequeña', () => {
    renderPage()
    const chip = screen.getByText(/Cotizaciones simuladas · 08:42/)
    expect(chip).toBeInTheDocument()
    expect(chip.className).toContain('text-sm') // 14px, no una letra diminuta
  })

  it('cada rentabilidad de posición se muestra en € y en %, con signo explícito', () => {
    renderPage()
    expect(screen.getByText('+1.310,00 €')).toBeInTheDocument()
    expect(screen.getByText('+43,7 %')).toBeInTheDocument()
  })

  it('la propuesta de rebalanceo va etiquetada como recomendación y da un importe concreto', () => {
    renderPage()
    expect(screen.getByText('Recomendación:')).toBeInTheDocument()
    expect(screen.getByText('2.720,00 €')).toBeInTheDocument()
  })

  it('Detalle añade columnas de aportado y peso sin duplicar la tabla de posiciones', () => {
    renderPage()
    expect(screen.queryByText('Peso en cartera')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Detalle' }))
    expect(screen.getAllByText('Fondo indexado mundial')).toHaveLength(1)
    expect(screen.getByText('Peso en cartera')).toBeInTheDocument()
    expect(screen.getByText('Por tipo de producto')).toBeInTheDocument()
  })
})
