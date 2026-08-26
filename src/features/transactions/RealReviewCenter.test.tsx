import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { RealReviewCenter } from './RealReviewCenter'
import { useTransactionsStore } from './store'
import type { RealCategory } from './useRealCategories'
import type { RealTransaction } from './useRealTransactions'

vi.mock('./useAiCategorization', () => ({
  suggestCategories: vi.fn(),
}))
vi.mock('./useRealTransactions', async () => {
  const actual = await vi.importActual<typeof import('./useRealTransactions')>('./useRealTransactions')
  return { ...actual, bulkApplyCategorySuggestions: vi.fn() }
})

const { suggestCategories } = await import('./useAiCategorization')
const { bulkApplyCategorySuggestions } = await import('./useRealTransactions')

const transactions: RealTransaction[] = [
  {
    id: 'tx-1',
    fecha: '25 ago',
    comercio: 'Mercadona',
    cuenta: 'Revolut',
    categoria: 'Sin clasificar',
    importe: -32,
    categoryId: null,
    accountId: 'acc-1',
    needsReview: false,
    userNote: '',
    tags: [],
    dateISO: '2026-08-25',
    isInternalTransfer: false,
    receiptPath: null,
  },
  {
    id: 'tx-2',
    fecha: '25 ago',
    comercio: 'Netflix',
    cuenta: 'Revolut',
    categoria: 'Sin clasificar',
    importe: -12,
    categoryId: null,
    accountId: 'acc-1',
    needsReview: false,
    userNote: '',
    tags: [],
    dateISO: '2026-08-25',
    isInternalTransfer: false,
    receiptPath: null,
  },
]
const categories: RealCategory[] = [
  { id: 'cat-1', name: 'Supermercado', icon: null, categoryGroup: 'alimentacion' },
  { id: 'cat-2', name: 'Ocio y suscripciones', icon: null, categoryGroup: 'ocio' },
]

const manyTransactions: RealTransaction[] = Array.from({ length: 6 }, (_, i) => ({
  ...transactions[0],
  id: `tx-many-${i}`,
}))

function renderCenter(onSaveCategory = vi.fn().mockResolvedValue(null), onBulkClassified = vi.fn(), txs = transactions) {
  useTransactionsStore.setState({ panelTransactionId: null })
  return {
    onSaveCategory,
    onBulkClassified,
    ...render(
      <BrowserRouter>
        <RealReviewCenter transactions={txs} categories={categories} onSaveCategory={onSaveCategory} onBulkClassified={onBulkClassified} />
      </BrowserRouter>,
    ),
  }
}

describe('RealReviewCenter', () => {
  it('al pulsar "Sugerir categorías con IA", muestra la sugerencia con Aceptar/Descartar', async () => {
    vi.mocked(suggestCategories).mockResolvedValue({ suggestions: [{ transactionId: 'tx-1', categoryId: 'cat-1' }], error: null })
    renderCenter()

    fireEvent.click(screen.getByRole('button', { name: 'Sugerir categorías con IA' }))
    expect(await screen.findByText('Supermercado')).toBeInTheDocument()
    expect(screen.getByText('Sugerencia IA')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aceptar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Descartar' })).toBeInTheDocument()
  })

  it('al aceptar, llama a onSaveCategory con el id sugerido y la sugerencia desaparece', async () => {
    vi.mocked(suggestCategories).mockResolvedValue({ suggestions: [{ transactionId: 'tx-1', categoryId: 'cat-1' }], error: null })
    const { onSaveCategory } = renderCenter()

    fireEvent.click(screen.getByRole('button', { name: 'Sugerir categorías con IA' }))
    await screen.findByText('Supermercado')
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar' }))

    await waitFor(() => expect(onSaveCategory).toHaveBeenCalledWith('tx-1', 'cat-1'))
    await waitFor(() => expect(screen.queryByText('Sugerencia IA')).not.toBeInTheDocument())
  })

  it('al descartar, la sugerencia desaparece sin llamar a onSaveCategory', async () => {
    vi.mocked(suggestCategories).mockResolvedValue({ suggestions: [{ transactionId: 'tx-1', categoryId: 'cat-1' }], error: null })
    const { onSaveCategory } = renderCenter()

    fireEvent.click(screen.getByRole('button', { name: 'Sugerir categorías con IA' }))
    await screen.findByText('Supermercado')
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))

    expect(screen.queryByText('Sugerencia IA')).not.toBeInTheDocument()
    expect(onSaveCategory).not.toHaveBeenCalled()
  })

  it('si la Edge Function falla, muestra el error en vez de una sugerencia fabricada', async () => {
    vi.mocked(suggestCategories).mockResolvedValue({ suggestions: [], error: 'No hemos podido sugerir categorías. Inténtalo de nuevo en unos minutos.' })
    renderCenter()

    fireEvent.click(screen.getByRole('button', { name: 'Sugerir categorías con IA' }))
    expect(await screen.findByText(/No hemos podido sugerir categorías/)).toBeInTheDocument()
    expect(screen.queryByText('Sugerencia IA')).not.toBeInTheDocument()
  })

  it('"Aceptar todas" guarda cada sugerencia y las hace desaparecer todas', async () => {
    vi.mocked(suggestCategories).mockResolvedValue({
      suggestions: [
        { transactionId: 'tx-1', categoryId: 'cat-1' },
        { transactionId: 'tx-2', categoryId: 'cat-2' },
      ],
      error: null,
    })
    const { onSaveCategory } = renderCenter()

    fireEvent.click(screen.getByRole('button', { name: 'Sugerir categorías con IA' }))
    await screen.findByRole('button', { name: 'Aceptar todas (2)' })
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar todas (2)' }))

    await waitFor(() => expect(onSaveCategory).toHaveBeenCalledWith('tx-1', 'cat-1'))
    expect(onSaveCategory).toHaveBeenCalledWith('tx-2', 'cat-2')
    await waitFor(() => expect(screen.queryByText('Sugerencia IA')).not.toBeInTheDocument())
  })

  it('"Aceptar todas" con un fallo parcial, deja la que falló para revisar a mano', async () => {
    vi.mocked(suggestCategories).mockResolvedValue({
      suggestions: [
        { transactionId: 'tx-1', categoryId: 'cat-1' },
        { transactionId: 'tx-2', categoryId: 'cat-2' },
      ],
      error: null,
    })
    const onSaveCategory = vi.fn((id: string) => Promise.resolve(id === 'tx-2' ? 'boom' : null))
    renderCenter(onSaveCategory)

    fireEvent.click(screen.getByRole('button', { name: 'Sugerir categorías con IA' }))
    await screen.findByRole('button', { name: 'Aceptar todas (2)' })
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar todas (2)' }))

    expect(await screen.findByText(/No hemos podido guardar 1 de 2 sugerencias/)).toBeInTheDocument()
    expect(screen.getAllByText('Sugerencia IA')).toHaveLength(1)
  })

  it('"Clasificar todos los pendientes con IA" repite rondas hasta que no hay más sugerencias, y refresca una sola vez al final', async () => {
    vi.mocked(suggestCategories)
      .mockReset()
      .mockResolvedValueOnce({ suggestions: manyTransactions.map((t) => ({ transactionId: t.id, categoryId: 'cat-1' })), error: null })
      .mockResolvedValueOnce({ suggestions: [], error: null })
    vi.mocked(bulkApplyCategorySuggestions)
      .mockReset()
      .mockResolvedValue({ appliedCount: manyTransactions.length, error: null })
    const { onBulkClassified } = renderCenter(undefined, undefined, manyTransactions)

    fireEvent.click(screen.getByRole('button', { name: 'Clasificar todos los pendientes con IA' }))

    await waitFor(() => expect(screen.getByText(/Clasificados 6 movimientos/)).toBeInTheDocument())
    expect(suggestCategories).toHaveBeenCalledTimes(2)
    expect(bulkApplyCategorySuggestions).toHaveBeenCalledTimes(1)
    expect(onBulkClassified).toHaveBeenCalledTimes(1)
  })
})
