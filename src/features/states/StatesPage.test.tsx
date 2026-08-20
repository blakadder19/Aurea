import { fireEvent, render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { StatesPage } from './StatesPage'

function renderPage() {
  return render(
    <BrowserRouter>
      <StatesPage />
    </BrowserRouter>,
  )
}

describe('StatesPage', () => {
  it('lista los siete estados de sistema por su etiqueta', () => {
    renderPage()
    const labels = [
      'Carga',
      'Vacío',
      'Error',
      'Datos desactualizados',
      'Sincronización en curso',
      'Sin resultados de búsqueda',
      'Confirmación con Deshacer',
    ]
    for (const label of labels) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('el estado de error ofrece Reintentar e Ir a Conexiones; el vacío una única acción', () => {
    renderPage()
    expect(screen.getAllByRole('button', { name: 'Reintentar' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Ir a Conexiones' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Crear un objetivo' })).toHaveLength(1)
  })

  it('el aviso de datos desactualizados dice la antigüedad y Reconectar la resuelve', () => {
    renderPage()
    expect(screen.getByText(/Última actualización hace 3 días/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reconectar ahora' }))
    expect(screen.getByText('Reconectado.')).toBeInTheDocument()
  })
})
