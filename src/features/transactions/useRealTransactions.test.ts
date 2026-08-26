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

const categories: RealCategory[] = [{ id: 'cat-1', name: 'Supermercado', icon: null }]

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
const { useRealTransactions } = await import('./useRealTransactions')

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
      },
    ])
  })
})
