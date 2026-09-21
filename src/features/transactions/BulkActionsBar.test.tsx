import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BulkActionsBar } from './BulkActionsBar'
import { useTransactionsStore } from './store'
import type { Transaction, TransactionTag } from '../../data/transactions'

/**
 * Siempre tres seleccionados: con uno solo, "se etiqueta solo el primero"
 * pasaría en verde, que es exactamente el fallo que se escapó a producción.
 */
const THREE = ['tx-1', 'tx-2', 'tx-3']

const CHINA: TransactionTag = { id: 'tag-china', name: 'viaje-china', emoji: '🇨🇳', color: 'cat-3' }
const COMIDA: TransactionTag = { id: 'tag-comida', name: 'comida', emoji: null, color: 'cat-1' }

const tx = (id: string, tags: TransactionTag[]): Transaction => ({
  id,
  fecha: '15 sep',
  comercio: `Mov ${id}`,
  cuenta: 'Revolut',
  categoria: 'Viajes',
  importe: -20,
  tags,
})

beforeEach(() => useTransactionsStore.setState({ selectedIds: new Set() }))
afterEach(() => useTransactionsStore.setState({ selectedIds: new Set() }))

describe('BulkActionsBar', () => {
  it('sin selección no se pinta nada', () => {
    render(<BulkActionsBar />)
    expect(screen.queryByTestId('bulk-actions-bar')).toBeNull()
  })

  it('va pegada arriba, para no quedarse fuera de pantalla al seleccionar abajo', () => {
    useTransactionsStore.setState({ selectedIds: new Set(THREE) })
    render(<BulkActionsBar />)
    expect(screen.getByTestId('bulk-actions-bar').className).toContain('sticky')
  })

  it('pone la etiqueta a LOS TRES, eligiéndola del catálogo', async () => {
    const onBulkAddTag = vi.fn().mockResolvedValue({ error: null, taggedCount: 3 })
    useTransactionsStore.setState({ selectedIds: new Set(THREE) })
    render(
      <BulkActionsBar
        onBulkAddTag={onBulkAddTag}
        onCreateTag={vi.fn()}
        availableTags={[CHINA, COMIDA]}
        transactions={THREE.map((id) => tx(id, []))}
      />,
    )

    expect(screen.getByText('3 movimientos seleccionados')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Añadir etiqueta' }))
    fireEvent.click(screen.getByRole('button', { name: /viaje-china/ }))

    await waitFor(() => expect(onBulkAddTag).toHaveBeenCalledWith(THREE, CHINA.id))
    await waitFor(() => expect(useTransactionsStore.getState().selectedIds.size).toBe(0))
  })

  it('crear una etiqueta es explícito: escribir solo filtra', async () => {
    const onCreateTag = vi.fn().mockResolvedValue({ error: null, tag: { ...CHINA, id: 'nueva' } })
    const onBulkAddTag = vi.fn().mockResolvedValue({ error: null, taggedCount: 3 })
    useTransactionsStore.setState({ selectedIds: new Set(THREE) })
    render(
      <BulkActionsBar
        onBulkAddTag={onBulkAddTag}
        onCreateTag={onCreateTag}
        availableTags={[COMIDA]}
        transactions={THREE.map((id) => tx(id, []))}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Añadir etiqueta' }))
    fireEvent.change(screen.getByLabelText('Buscar etiqueta'), { target: { value: 'viaje-china' } })
    // Escribir no ha creado nada todavía.
    expect(onCreateTag).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Crear «viaje-china»' }))

    // El emoji se elige pulsando, no escribiéndolo.
    fireEvent.click(screen.getByRole('button', { name: 'Emoji de la etiqueta' }))
    fireEvent.change(screen.getByLabelText('Buscar emoji'), { target: { value: 'china' } })
    fireEvent.click(screen.getByRole('button', { name: 'china' }))

    fireEvent.click(screen.getByRole('button', { name: 'Crear etiqueta' }))

    await waitFor(() => expect(onCreateTag).toHaveBeenCalledWith('viaje-china', '🇨🇳', expect.any(String)))
    // Y recién creada se aplica a los tres, sin tener que buscarla otra vez.
    await waitFor(() => expect(onBulkAddTag).toHaveBeenCalledWith(THREE, 'nueva'))
  })

  it('si los tres comparten una etiqueta, ofrece quitarla por su nombre', async () => {
    const onBulkRemoveTag = vi.fn().mockResolvedValue({ error: null, removedCount: 3 })
    useTransactionsStore.setState({ selectedIds: new Set(THREE) })
    render(<BulkActionsBar onBulkRemoveTag={onBulkRemoveTag} transactions={THREE.map((id) => tx(id, [CHINA]))} />)

    fireEvent.click(screen.getByRole('button', { name: /Quitar .*viaje-china/ }))
    await waitFor(() => expect(onBulkRemoveTag).toHaveBeenCalledWith(THREE, CHINA.id))
    await waitFor(() => expect(useTransactionsStore.getState().selectedIds.size).toBe(0))
  })

  it('si no comparten ninguna, no se ofrece quitar nada', () => {
    useTransactionsStore.setState({ selectedIds: new Set(THREE) })
    render(
      <BulkActionsBar
        onBulkRemoveTag={vi.fn()}
        transactions={[tx('tx-1', [CHINA]), tx('tx-2', [CHINA]), tx('tx-3', [])]}
      />,
    )
    expect(screen.queryByRole('button', { name: /^Quitar / })).toBeNull()
    expect(screen.queryByLabelText('Quitar una etiqueta de los movimientos seleccionados')).toBeNull()
  })

  it('si comparten varias, hay que elegir cuál', async () => {
    const onBulkRemoveTag = vi.fn().mockResolvedValue({ error: null, removedCount: 3 })
    useTransactionsStore.setState({ selectedIds: new Set(THREE) })
    render(<BulkActionsBar onBulkRemoveTag={onBulkRemoveTag} transactions={THREE.map((id) => tx(id, [CHINA, COMIDA]))} />)

    // Nada de adivinar por el usuario: botón directo no, desplegable sí.
    expect(screen.queryByRole('button', { name: /^Quitar / })).toBeNull()
    const select = screen.getByLabelText('Quitar una etiqueta de los movimientos seleccionados')
    fireEvent.change(select, { target: { value: COMIDA.id } })

    await waitFor(() => expect(onBulkRemoveTag).toHaveBeenCalledWith(THREE, COMIDA.id))
  })

  it('si quitar falla, lo dice y no pierde la selección', async () => {
    const onBulkRemoveTag = vi.fn().mockResolvedValue({ error: 'No hemos podido quitar la etiqueta.', removedCount: 0 })
    useTransactionsStore.setState({ selectedIds: new Set(THREE) })
    render(<BulkActionsBar onBulkRemoveTag={onBulkRemoveTag} transactions={THREE.map((id) => tx(id, [CHINA]))} />)

    fireEvent.click(screen.getByRole('button', { name: /Quitar .*viaje-china/ }))
    await waitFor(() => expect(screen.getByText('No hemos podido quitar la etiqueta.')).toBeInTheDocument())
    expect(useTransactionsStore.getState().selectedIds.size).toBe(3)
  })

  it('si solo se etiquetan dos de tres, lo dice y no limpia la selección', async () => {
    const onBulkAddTag = vi.fn().mockResolvedValue({ error: 'Solo hemos podido etiquetar 2 de 3 movimientos. Inténtalo de nuevo.', taggedCount: 2 })
    useTransactionsStore.setState({ selectedIds: new Set(THREE) })
    render(
      <BulkActionsBar onBulkAddTag={onBulkAddTag} onCreateTag={vi.fn()} availableTags={[CHINA]} transactions={THREE.map((id) => tx(id, []))} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Añadir etiqueta' }))
    fireEvent.click(screen.getByRole('button', { name: /viaje-china/ }))

    await waitFor(() => expect(screen.getByText(/Solo hemos podido etiquetar 2 de 3/)).toBeInTheDocument())
    expect(useTransactionsStore.getState().selectedIds.size).toBe(3)
  })
})
