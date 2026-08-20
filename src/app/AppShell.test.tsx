import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { BottomNav } from './BottomNav'
import { MorePage } from './MorePage'

describe('BottomNav', () => {
  it('tiene cinco ítems con texto visible, cada uno enlazando a una ruta real', () => {
    render(
      <BrowserRouter>
        <BottomNav />
      </BrowserRouter>,
    )
    const expected: Record<string, string> = {
      Inicio: '/',
      Movimientos: '/movimientos',
      Presupuesto: '/presupuesto',
      Objetivos: '/objetivos',
      Más: '/mas',
    }
    for (const [label, to] of Object.entries(expected)) {
      expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', to)
    }
  })
})

describe('MorePage', () => {
  it('lista las secciones del sidebar que no caben en la navegación inferior, agrupadas', () => {
    render(
      <BrowserRouter>
        <MorePage />
      </BrowserRouter>,
    )
    // Las cuatro pestañas inferiores no se repiten aquí.
    expect(screen.queryByRole('link', { name: 'Inicio' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Movimientos' })).not.toBeInTheDocument()

    const rest = [
      'Cuentas y patrimonio',
      'Pagos y suscripciones',
      'Inversiones',
      'Deudas',
      'Planificación',
      'Asistente e insights',
      'Conexiones y ajustes',
    ]
    for (const label of rest) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }
  })
})
