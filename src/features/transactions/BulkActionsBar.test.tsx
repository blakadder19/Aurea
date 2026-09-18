import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BulkActionsBar } from './BulkActionsBar'
import { useTransactionsStore } from './store'

/**
 * La banda de acciones en lote vive dentro del `<main>` con scroll de
 * Movimientos, por encima de la tabla. Si no está pegada arriba, seleccionar
 * una casilla de la fila 200 la renderiza fuera de la pantalla y parece que
 * la selección no hace nada.
 *
 * jsdom no calcula layout, así que la posición real no se puede comprobar
 * aquí: lo que impide este test es que la clase desaparezca sin que nadie se
 * entere. El resto sí se ejerce de verdad.
 */

// El store arranca con la selección de ejemplo de la demo.
beforeEach(() => {
  useTransactionsStore.setState({ selectedIds: new Set() })
})
afterEach(() => {
  useTransactionsStore.setState({ selectedIds: new Set() })
})

describe('BulkActionsBar', () => {
  it('sin selección no se pinta nada', () => {
    render(<BulkActionsBar onBulkAddTag={vi.fn()} />)
    expect(screen.queryByTestId('bulk-actions-bar')).toBeNull()
  })

  it('va pegada arriba, para no quedarse fuera de pantalla al seleccionar abajo', () => {
    useTransactionsStore.setState({ selectedIds: new Set(['tx-1']) })
    render(<BulkActionsBar onBulkAddTag={vi.fn()} />)
    expect(screen.getByTestId('bulk-actions-bar').className).toContain('sticky')
  })

  it('etiqueta los seleccionados y limpia la selección', async () => {
    const onBulkAddTag = vi.fn().mockResolvedValue(null)
    useTransactionsStore.setState({ selectedIds: new Set(['tx-1', 'tx-2']) })
    render(<BulkActionsBar onBulkAddTag={onBulkAddTag} />)

    expect(screen.getByText('2 movimientos seleccionados')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Añadir etiqueta' }))
    fireEvent.change(screen.getByPlaceholderText('Nombre de la etiqueta'), { target: { value: 'viaje-china' } })
    fireEvent.click(screen.getByRole('button', { name: 'Añadir' }))

    await waitFor(() => expect(onBulkAddTag).toHaveBeenCalledWith(['tx-1', 'tx-2'], 'viaje-china'))
    await waitFor(() => expect(useTransactionsStore.getState().selectedIds.size).toBe(0))
  })

  it('con Enter también, sin tener que buscar el botón', async () => {
    const onBulkAddTag = vi.fn().mockResolvedValue(null)
    useTransactionsStore.setState({ selectedIds: new Set(['tx-1']) })
    render(<BulkActionsBar onBulkAddTag={onBulkAddTag} />)

    fireEvent.click(screen.getByRole('button', { name: 'Añadir etiqueta' }))
    const input = screen.getByPlaceholderText('Nombre de la etiqueta')
    fireEvent.change(input, { target: { value: 'viaje-china' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(onBulkAddTag).toHaveBeenCalledWith(['tx-1'], 'viaje-china'))
  })

  it('si falla, lo dice y no pierde la selección', async () => {
    const onBulkAddTag = vi.fn().mockResolvedValue('No hemos podido guardar la etiqueta.')
    useTransactionsStore.setState({ selectedIds: new Set(['tx-1']) })
    render(<BulkActionsBar onBulkAddTag={onBulkAddTag} />)

    fireEvent.click(screen.getByRole('button', { name: 'Añadir etiqueta' }))
    fireEvent.change(screen.getByPlaceholderText('Nombre de la etiqueta'), { target: { value: 'viaje-china' } })
    fireEvent.click(screen.getByRole('button', { name: 'Añadir' }))

    await waitFor(() => expect(screen.getByText('No hemos podido guardar la etiqueta.')).toBeInTheDocument())
    expect(useTransactionsStore.getState().selectedIds.size).toBe(1)
  })
})
