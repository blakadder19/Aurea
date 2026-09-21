import { act, render, screen, within } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'

/**
 * El resumen se calcula sobre los MISMOS movimientos que se ven debajo. Este
 * test entra por la página real para comprobar el cableado: que aparece solo
 * al filtrar por una etiqueta y que la cifra es la de esos movimientos.
 */

const TAG = { id: 'tag-china', name: 'viaje-china', emoji: '🇨🇳', color: 'cat-3' }

function mkRow(i: number, amount: number, categoryId: string | null, tagged: boolean) {
  return {
    row: {
      id: `tx-${i}`,
      account_id: 'acc-1',
      booking_date: `2026-09-1${i}`,
      value_date: null,
      description: `Mov ${i}`,
      amount_cents: amount,
      currency: 'EUR',
      transaction_code: 'CARD_PAYMENT',
      exchange_rate: null,
      instructed_amount_cents: null,
      category_id: categoryId,
      needs_review: false,
      user_note: null,
      display_name: null,
      is_internal_transfer: false,
      receipt_path: null,
      income_type: null,
      is_reimbursement: false,
      is_balance_adjustment: false,
    },
    tagged,
  }
}

const ROWS = [mkRow(2, -2000, 'cat-rest', true), mkRow(4, -3000, 'cat-tran', true), mkRow(6, -9999, 'cat-rest', false)]

function chainable(table: string) {
  const b: Record<string, unknown> = {}
  for (const m of ['select', 'order', 'limit', 'eq', 'neq', 'in', 'not', 'or', 'is', 'ilike']) b[m] = () => b
  // oxlint-disable-next-line unicorn/no-thenable -- imita a propósito el query builder real de supabase-js.
  b.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) => {
    if (table === 'transactions') return Promise.resolve(resolve({ data: ROWS.map((r) => r.row), error: null }))
    if (table === 'transaction_tags')
      return Promise.resolve(resolve({ data: ROWS.filter((r) => r.tagged).map((r) => ({ transaction_id: r.row.id, tags: TAG })), error: null }))
    if (table === 'tags') return Promise.resolve(resolve({ data: [TAG], error: null }))
    return Promise.resolve(resolve({ data: [], error: null }))
  }
  return b
}

vi.mock('../../lib/supabase/client', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: (t: string) => chainable(t),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u' } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(),
    },
  },
}))
vi.mock('./useRealCategories', async () => {
  const a = await vi.importActual<typeof import('./useRealCategories')>('./useRealCategories')
  const categories = [
    { id: 'cat-rest', name: 'Restaurantes', icon: null, categoryGroup: 'alimentacion', parentId: null },
    { id: 'cat-tran', name: 'Transporte', icon: null, categoryGroup: 'transporte', parentId: null },
  ]
  return { ...a, useRealCategories: () => ({ categories, loading: false, refetch: vi.fn() }) }
})
vi.mock('../settings/useRealConnections', () => ({
  useRealConnections: () => ({ connections: [], loading: false, refetch: vi.fn() }),
  latestSync: () => null,
}))
vi.mock('../accounts/useRealAccounts', () => ({ useRealAccounts: () => ({ accounts: [], loading: false, refetch: vi.fn() }) }))

const { TransactionsPage } = await import('./TransactionsPage')
const { useAuthStore } = await import('../../lib/supabase/useAuth')
const { useTransactionsStore } = await import('./store')
const { ALL_TAGS } = await import('./store')

async function renderPage() {
  useAuthStore.setState({ session: { user: { id: 'u' } } as unknown as Session })
  render(
    <BrowserRouter>
      <TransactionsPage />
    </BrowserRouter>,
  )
  await act(async () => {
    await new Promise((r) => setTimeout(r, 300))
  })
}

afterEach(() => {
  useTransactionsStore.setState({ tagFilter: ALL_TAGS, view: 'tabla' })
  useAuthStore.setState({ session: null })
})

describe('resumen de una etiqueta', () => {
  it('sin filtro de etiqueta no se enseña ningún resumen', async () => {
    await renderPage()
    expect(screen.queryByTestId('tag-summary')).toBeNull()
  })

  it('al filtrar, sale el total de lo etiquetado y su reparto por categoría', async () => {
    useTransactionsStore.setState({ tagFilter: TAG.id })
    await renderPage()

    const resumen = within(screen.getByTestId('tag-summary'))

    // 20,00 + 30,00 de los dos etiquetados. Los 99,99 del tercero no entran.
    expect(resumen.getByText('50,00 €')).toBeInTheDocument()
    expect(resumen.getByText('2 movimientos · 12 sep – 14 sep')).toBeInTheDocument()

    expect(resumen.getByText('Transporte')).toBeInTheDocument()
    expect(resumen.getByText('30,00 €')).toBeInTheDocument()
    expect(resumen.getByText('Restaurantes')).toBeInTheDocument()
    expect(resumen.getByText('20,00 €')).toBeInTheDocument()
  })
})
