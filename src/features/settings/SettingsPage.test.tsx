import { fireEvent, render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { csvColumns } from '../../data/settings'
import { SettingsPage } from './SettingsPage'
import { useSettingsStore } from './store'

function renderPage() {
  return render(
    <BrowserRouter>
      <SettingsPage />
    </BrowserRouter>,
  )
}

const initialMapping = Object.fromEntries(csvColumns.map((c) => [c.fileColumn, c.field]))

function resetStore() {
  useSettingsStore.setState({
    connectionOverrides: {},
    importOpen: false,
    step: 1,
    maxStepReached: 1,
    mapping: initialMapping,
    importConfirmed: false,
    demoDataCleared: false,
  })
}

describe('SettingsPage', () => {
  afterEach(resetStore)

  it('las seis conexiones muestran su estado con icono y palabra, nunca solo color', () => {
    renderPage()
    expect(screen.getAllByText('Sincronizado')).toHaveLength(4)
    expect(screen.getByText('Sincronizando')).toBeInTheDocument()
    expect(screen.getByText('Error')).toBeInTheDocument()
  })

  it('el error de MyInvestor ofrece Reconectar en la propia fila', () => {
    renderPage()
    expect(screen.getByRole('button', { name: 'Reconectar' })).toBeInTheDocument()
  })

  it('el flujo CSV navega los tres pasos adelante y atrás sin perder lo mapeado', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Importar CSV' }))

    // Se duplica (lista de móvil + tabla de escritorio); basta con cambiar una.
    const fechaSelect = screen.getAllByDisplayValue('Fecha')[0]
    fireEvent.change(fechaSelect, { target: { value: 'cuenta' } })

    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('Altas nuevas')).toBeInTheDocument()
    expect(screen.getByText('Filas rechazadas')).toBeInTheDocument()

    // vuelve al paso 1 y comprueba que el mapeo cambiado sigue ahí
    fireEvent.click(screen.getByRole('button', { name: /Mapear columnas/ }))
    expect(useSettingsStore.getState().mapping['Fecha_Op']).toBe('cuenta')
  })

  it('el paso 3 confirma la importación de forma explícita', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Importar CSV' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar importación' }))
    expect(screen.getByText('Importación confirmada')).toBeInTheDocument()
  })
})
