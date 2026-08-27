import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import type { RealCategory } from './useRealCategories'

/**
 * Query builder falso: cada método de encadenado se devuelve a sí mismo;
 * `then` resuelve el fixture de esa tabla — mismo patrón que
 * useRealAccounts.test.ts.
 */
function chainable(data: unknown[]) {
  const builder: Record<string, unknown> = {}
  for (const method of ['select', 'order', 'limit']) {
    builder[method] = () => builder
  }
  // oxlint-disable-next-line unicorn/no-thenable -- imita a propósito el query builder real de supabase-js.
  builder.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) => Promise.resolve(resolve({ data, error: null }))
  return builder
}

const fixtures: Record<string, unknown[]> = {
  transactions: [
    {
      id: 'tx-1',
      account_id: 'acc-1',
      booking_date: '2026-08-19',
      value_date: null,
      description: 'Mercadona',
      amount_cents: -6218,
      category_id: 'cat-1',
      needs_review: false,
      user_note: null,
      tags: [],
      display_name: null,
      is_internal_transfer: false,
    },
    {
      id: 'tx-2',
      account_id: 'acc-1',
      booking_date: '2026-08-18',
      value_date: null,
      description: 'AMZN Mktp ES',
      amount_cents: -3490,
      category_id: null,
      needs_review: false,
      user_note: 'revisar',
      tags: ['amazon'],
      display_name: 'Compra de Amazon',
      is_internal_transfer: false,
    },
  ],
  accounts: [{ id: 'acc-1', name: 'Nómina', product: null, connection_id: 'conn-1' }],
  bank_connections: [{ id: 'conn-1', aspsp_name: 'Openbank' }],
}

const categories: RealCategory[] = [{ id: 'cat-1', name: 'Supermercado', icon: null, categoryGroup: 'alimentacion', parentId: null }]

const mockFrom = vi.fn((table: string) => chainable(fixtures[table] ?? []))

vi.mock('../../lib/supabase/client', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: (table: string) => mockFrom(table),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(),
    },
  },
}))

const activeSession = { user: { id: 'user-1' } } as unknown as Session

const { useAuthStore } = await import('../../lib/supabase/useAuth')
const { useRealTransactions, isTransactionPending } = await import('./useRealTransactions')

describe('useRealTransactions', () => {
  it('sin sesión, devuelve transactions=null sin consultar Supabase', () => {
    useAuthStore.setState({ session: null })
    const { result } = renderHook(() => useRealTransactions(categories))
    expect(result.current.loading).toBe(false)
    expect(result.current.transactions).toBeNull()
  })

  it('mientras las categorías siguen cargando (null), se queda en loading', () => {
    useAuthStore.setState({ session: activeSession })
    const { result } = renderHook(() => useRealTransactions(null))
    expect(result.current.loading).toBe(true)
    expect(result.current.transactions).toBeNull()
  })

  it('con sesión y categorías, arma Transaction[] con el nombre de categoría o «Sin clasificar»', async () => {
    useAuthStore.setState({ session: activeSession })
    const { result } = renderHook(() => useRealTransactions(categories))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.transactions).toEqual([
      {
        id: 'tx-1',
        fecha: '19 ago',
        comercio: 'Mercadona',
        cuenta: 'Nómina · Openbank',
        categoria: 'Supermercado',
        importe: -62.18,
        categoryId: 'cat-1',
        accountId: 'acc-1',
        needsReview: false,
        userNote: '',
        tags: [],
        displayName: null,
        dateISO: '2026-08-19',
        isInternalTransfer: false,
        receiptPath: null,
        hasSplits: false,
        incomeType: null,
        isReimbursement: false,
        isBalanceAdjustment: false,
      },
      {
        id: 'tx-2',
        fecha: '18 ago',
        comercio: 'AMZN Mktp ES',
        cuenta: 'Nómina · Openbank',
        categoria: 'Sin clasificar',
        importe: -34.9,
        categoryId: null,
        accountId: 'acc-1',
        needsReview: false,
        userNote: 'revisar',
        tags: ['amazon'],
        displayName: 'Compra de Amazon',
        dateISO: '2026-08-18',
        isInternalTransfer: false,
        receiptPath: null,
        hasSplits: false,
        incomeType: null,
        isReimbursement: false,
        isBalanceAdjustment: false,
      },
    ])
  })

  it('un movimiento con filas en transaction_splits sale como hasSplits y con categoria "Varias categorías"', async () => {
    fixtures.transaction_splits = [{ transaction_id: 'tx-1' }]
    useAuthStore.setState({ session: activeSession })
    const { result } = renderHook(() => useRealTransactions(categories))

    await waitFor(() => expect(result.current.loading).toBe(false))

    const split = result.current.transactions?.find((t) => t.id === 'tx-1')
    expect(split?.hasSplits).toBe(true)
    expect(split?.categoria).toBe('Varias categorías')

    const notSplit = result.current.transactions?.find((t) => t.id === 'tx-2')
    expect(notSplit?.hasSplits).toBe(false)

    delete fixtures.transaction_splits
  })

  it('propaga income_type (snake_case) como incomeType', async () => {
    fixtures.transactions = [
      {
        id: 'tx-3',
        account_id: 'acc-1',
        booking_date: '2026-08-19',
        value_date: null,
        description: 'Nómina',
        amount_cents: 250000,
        category_id: null,
        needs_review: false,
        user_note: null,
        tags: [],
        display_name: null,
        is_internal_transfer: false,
        income_type: 'salario',
      },
    ]
    useAuthStore.setState({ session: activeSession })
    const { result } = renderHook(() => useRealTransactions(categories))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.transactions?.[0].incomeType).toBe('salario')
  })
})

describe('isTransactionPending', () => {
  it('sin categoría, está pendiente', () => {
    expect(isTransactionPending({ categoryId: null, needsReview: false, hasSplits: false, isInternalTransfer: false })).toBe(true)
  })

  it('marcado needsReview, está pendiente aunque ya tenga categoría', () => {
    expect(isTransactionPending({ categoryId: 'cat-1', needsReview: true, hasSplits: false, isInternalTransfer: false })).toBe(true)
  })

  it('dividido en varias categorías, nunca está pendiente aunque no tenga categoryId propio', () => {
    expect(isTransactionPending({ categoryId: null, needsReview: false, hasSplits: true, isInternalTransfer: false })).toBe(false)
  })

  it('transferencia interna sin categoría, nunca está pendiente', () => {
    expect(isTransactionPending({ categoryId: null, needsReview: false, hasSplits: false, isInternalTransfer: true })).toBe(false)
  })

  it('con categoría, sin needsReview, no dividido ni transferencia: no está pendiente', () => {
    expect(isTransactionPending({ categoryId: 'cat-1', needsReview: false, hasSplits: false, isInternalTransfer: false })).toBe(false)
  })
})
