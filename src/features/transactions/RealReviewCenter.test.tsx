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

const { suggestCategories } = await import('./useAiCategorization')

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
  },
]
const categories: RealCategory[] = [{ id: 'cat-1', name: 'Supermercado' }]

function renderCenter(onSaveCategory = vi.fn().mockResolvedValue(null)) {
  useTransactionsStore.setState({ panelTransactionId: null })
  return {
    onSaveCategory,
    ...render(
      <BrowserRouter>
        <RealReviewCenter transactions={transactions} categories={categories} onSaveCategory={onSaveCategory} />
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
})
