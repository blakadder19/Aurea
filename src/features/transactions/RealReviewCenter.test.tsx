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
    hasSplits: false,
    incomeType: null,
    isReimbursement: false,
    isBalanceAdjustment: false,
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
    hasSplits: false,
    incomeType: null,
    isReimbursement: false,
    isBalanceAdjustment: false,
  },
]
const categories: RealCategory[] = [
  { id: 'cat-1', name: 'Supermercado', icon: null, categoryGroup: 'alimentacion', parentId: null },
  { id: 'cat-2', name: 'Ocio y suscripciones', icon: null, categoryGroup: 'ocio', parentId: null },
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
        <RealReviewCenter
          transactions={txs}
          categories={categories}
          onSaveCategory={onSaveCategory}
          onBulkClassified={onBulkClassified}
          ownAccountNames={[]}
        />
      </BrowserRouter>,
    ),
  }
}

describe('RealReviewCenter', () => {
  it('al pulsar "Sugerir categorías con IA", muestra la sugerencia con Aceptar/Descartar', async () => {
    vi.mocked(suggestCategories).mockResolvedValue({ suggestions: [{ transactionId: 'tx-1', categoryId: 'cat-1', confidence: 'alta' }], error: null })
    renderCenter()

    fireEvent.click(screen.getByRole('button', { name: 'Sugerir categorías con IA' }))
    expect(await screen.findByText('Supermercado')).toBeInTheDocument()
    expect(screen.getByText('Sugerencia IA')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aceptar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Descartar' })).toBeInTheDocument()
  })

  it('al aceptar, llama a onSaveCategory con el id sugerido y la sugerencia desaparece', async () => {
    vi.mocked(suggestCategories).mockResolvedValue({ suggestions: [{ transactionId: 'tx-1', categoryId: 'cat-1', confidence: 'alta' }], error: null })
    const { onSaveCategory } = renderCenter()

    fireEvent.click(screen.getByRole('button', { name: 'Sugerir categorías con IA' }))
    await screen.findByText('Supermercado')
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar' }))

    await waitFor(() => expect(onSaveCategory).toHaveBeenCalledWith('tx-1', 'cat-1'))
    await waitFor(() => expect(screen.queryByText('Sugerencia IA')).not.toBeInTheDocument())
  })

  it('al descartar, la sugerencia desaparece sin llamar a onSaveCategory', async () => {
    vi.mocked(suggestCategories).mockResolvedValue({ suggestions: [{ transactionId: 'tx-1', categoryId: 'cat-1', confidence: 'alta' }], error: null })
    const { onSaveCategory } = renderCenter()

    fireEvent.click(screen.getByRole('button', { name: 'Sugerir categorías con IA' }))
    await screen.findByText('Supermercado')
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))

    expect(screen.queryByText('Sugerencia IA')).not.toBeInTheDocument()
    expect(onSaveCategory).not.toHaveBeenCalled()
  })

  it('una sugerencia insegura se muestra como "¿Quizás...?" y no cuenta para "Aceptar todas"', async () => {
    vi.mocked(suggestCategories).mockResolvedValue({
      suggestions: [
        { transactionId: 'tx-1', categoryId: 'cat-1', confidence: 'baja' },
        { transactionId: 'tx-2', categoryId: 'cat-2', confidence: 'alta' },
      ],
      error: null,
    })
    renderCenter()

    fireEvent.click(screen.getByRole('button', { name: 'Sugerir categorías con IA' }))
    expect(await screen.findByText('¿Quizás...?')).toBeInTheDocument()
    expect(screen.getByText('Sugerencia IA')).toBeInTheDocument() // la de confianza alta, sin cambios
    expect(screen.getByRole('button', { name: 'Aceptar todas (1)' })).toBeInTheDocument() // solo cuenta la segura
  })

  it('una sugerencia insegura solo se acepta una a una, "Aceptar todas" no la toca', async () => {
    vi.mocked(suggestCategories).mockResolvedValue({
      suggestions: [
        { transactionId: 'tx-1', categoryId: 'cat-1', confidence: 'baja' },
        { transactionId: 'tx-2', categoryId: 'cat-2', confidence: 'alta' },
      ],
      error: null,
    })
    const { onSaveCategory } = renderCenter()

    fireEvent.click(screen.getByRole('button', { name: 'Sugerir categorías con IA' }))
    await screen.findByRole('button', { name: 'Aceptar todas (1)' })
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar todas (1)' }))

    await waitFor(() => expect(onSaveCategory).toHaveBeenCalledWith('tx-2', 'cat-2'))
    expect(onSaveCategory).not.toHaveBeenCalledWith('tx-1', 'cat-1')
    expect(screen.getByText('¿Quizás...?')).toBeInTheDocument() // sigue ahí, pendiente de decisión manual
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
        { transactionId: 'tx-1', categoryId: 'cat-1', confidence: 'alta' },
        { transactionId: 'tx-2', categoryId: 'cat-2', confidence: 'alta' },
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
        { transactionId: 'tx-1', categoryId: 'cat-1', confidence: 'alta' },
        { transactionId: 'tx-2', categoryId: 'cat-2', confidence: 'alta' },
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
      .mockResolvedValueOnce({ suggestions: manyTransactions.map((t) => ({ transactionId: t.id, categoryId: 'cat-1', confidence: 'alta' as const })), error: null })
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

  it('"Clasificar todos" para en cuanto una ronda solo trae sugerencias inseguras, sin aplicarlas en bloque', async () => {
    vi.mocked(suggestCategories)
      .mockReset()
      .mockResolvedValueOnce({ suggestions: manyTransactions.map((t) => ({ transactionId: t.id, categoryId: 'cat-1', confidence: 'baja' as const })), error: null })
    vi.mocked(bulkApplyCategorySuggestions).mockReset().mockResolvedValue({ appliedCount: 0, error: null })
    renderCenter(undefined, undefined, manyTransactions)

    fireEvent.click(screen.getByRole('button', { name: 'Clasificar todos los pendientes con IA' }))

    await waitFor(() => expect(screen.getByText(/La IA no tiene claros los que quedan/)).toBeInTheDocument())
    expect(bulkApplyCategorySuggestions).not.toHaveBeenCalled()
    expect(suggestCategories).toHaveBeenCalledTimes(1)
  })

  it('"Cancelar" detiene el bucle antes de la siguiente ronda, sin perder lo ya clasificado', async () => {
    let resolveRound1: (v: { suggestions: { transactionId: string; categoryId: string; confidence: 'alta' | 'baja' }[]; error: null }) => void = () => {}
    const round1Promise = new Promise<{ suggestions: { transactionId: string; categoryId: string; confidence: 'alta' | 'baja' }[]; error: null }>((resolve) => {
      resolveRound1 = resolve
    })
    vi.mocked(suggestCategories).mockReset().mockReturnValueOnce(round1Promise)
    vi.mocked(bulkApplyCategorySuggestions)
      .mockReset()
      .mockResolvedValue({ appliedCount: manyTransactions.length, error: null })
    renderCenter(undefined, undefined, manyTransactions)

    fireEvent.click(screen.getByRole('button', { name: 'Clasificar todos los pendientes con IA' }))
    await screen.findByRole('button', { name: 'Cancelar' })
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    resolveRound1({ suggestions: manyTransactions.map((t) => ({ transactionId: t.id, categoryId: 'cat-1', confidence: 'alta' as const })), error: null })

    await waitFor(() => expect(screen.getByText(/Clasificados 6 movimientos antes de cancelar/)).toBeInTheDocument())
    expect(suggestCategories).toHaveBeenCalledTimes(1)
  })

  it('mientras "Clasificar todos" corre, "Sugerir" y "Aceptar todas" quedan deshabilitados para no pisarse', async () => {
    let resolveRound1: (v: { suggestions: { transactionId: string; categoryId: string; confidence: 'alta' | 'baja' }[]; error: null }) => void = () => {}
    const round1Promise = new Promise<{ suggestions: { transactionId: string; categoryId: string; confidence: 'alta' | 'baja' }[]; error: null }>((resolve) => {
      resolveRound1 = resolve
    })
    vi.mocked(suggestCategories).mockReset().mockReturnValueOnce(round1Promise)
    vi.mocked(bulkApplyCategorySuggestions).mockReset().mockResolvedValue({ appliedCount: 0, error: null })
    renderCenter(undefined, undefined, manyTransactions)

    fireEvent.click(screen.getByRole('button', { name: 'Clasificar todos los pendientes con IA' }))
    await screen.findByRole('button', { name: 'Cancelar' })

    expect(screen.getByRole('button', { name: 'Sugerir categorías con IA' })).toBeDisabled()

    resolveRound1({ suggestions: [], error: null })
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument())
  })
})
