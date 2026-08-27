import { fireEvent, render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { HomePage } from './HomePage'

function renderHomePage() {
  return render(
    <BrowserRouter>
      <HomePage />
    </BrowserRouter>,
  )
}

describe('HomePage', () => {
  it('renders the Inicio heading and the hero figure once the loading skeleton resolves', async () => {
    renderHomePage()
    expect(screen.getByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
    // Aparece dos veces a propósito: la cifra hero y el total de la resta
    // que ahora se muestra siempre debajo ("Cuentas para gastar − pagos").
    expect(await screen.findAllByText('5.383,24 €')).not.toHaveLength(0)
  })

  it('switches to Detalle mode and shows the extra breakdown', () => {
    renderHomePage()
    fireEvent.click(screen.getByRole('button', { name: 'Detalle' }))
    expect(screen.getByText('Dónde se va el presupuesto de agosto')).toBeInTheDocument()
  })

  it('el botón Avisos lleva a la sección "Necesita tu atención" en vez de no hacer nada', () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    renderHomePage()
    fireEvent.click(screen.getByRole('button', { name: /Avisos/ }))
    expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: 'start' }))
  })
})
