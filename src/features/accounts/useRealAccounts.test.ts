import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'

/**
 * Query builder falso: cada método de encadenado se devuelve a sí mismo;
 * `then` resuelve el fixture de esa tabla — mimetiza a propósito el
 * query builder real de supabase-js, que también es thenable.
 */
function chainable(data: unknown[]) {
  const builder: Record<string, unknown> = {}
  for (const method of ['select', 'neq', 'eq', 'order', 'in', 'limit', 'insert']) {
    builder[method] = () => builder
  }
  // oxlint-disable-next-line unicorn/no-thenable -- imita a propósito el query builder real de supabase-js.
  builder.then = (resolve: (v: { data: unknown[] }) => unknown) => Promise.resolve(resolve({ data }))
  return builder
}

const fixtures: Record<string, unknown[]> = {
  accounts: [
    { id: 'acc-1', name: 'Nómina', product: null, connection_id: 'conn-1', account_function: 'gastar', currency: 'EUR' },
    { id: 'acc-2', name: null, product: 'Cuenta ahorro', connection_id: 'conn-1', account_function: 'ahorro', currency: 'GBP' },
  ],
  bank_connections: [{ id: 'conn-1', aspsp_name: 'Openbank' }],
  balances: [
    { account_id: 'acc-1', amount_cents: 423864 },
    { account_id: 'acc-2', amount_cents: 1000000 },
  ],
  transactions: [
    { account_id: 'acc-1', booking_date: '2026-08-19', value_date: null, description: 'Mercadona', amount_cents: -6218 },
  ],
}

const mockFrom = vi.fn((table: string) => chainable(fixtures[table] ?? []))

vi.mock('../../lib/supabase/client', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: (table: string) => mockFrom(table),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      onAuthStateChange: vi.fn(),
    },
  },
}))

const activeSession = { user: { id: 'user-1' } } as unknown as Session

const { useAuthStore } = await import('../../lib/supabase/useAuth')
const { useRealAccounts } = await import('./useRealAccounts')

describe('useRealAccounts', () => {
  it('sin sesión, devuelve accounts=null sin consultar Supabase', () => {
    useAuthStore.setState({ session: null })
    const { result } = renderHook(() => useRealAccounts())
    expect(result.current.loading).toBe(false)
    expect(result.current.accounts).toBeNull()
  })

  it('con sesión, arma Account[] a partir de accounts+balances+bank_connections+transactions', async () => {
    useAuthStore.setState({ session: activeSession })
    const { result } = renderHook(() => useRealAccounts())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.accounts).toEqual([
      {
        id: 'acc-1',
        name: 'Nómina',
        institution: 'Openbank',
        fn: 'Para gastar',
        balance: 4238.64,
        sharePercent: 100,
        currency: 'EUR',
        countsInAvailableToday: true,
        recentMovements: [{ date: '19 ago', label: 'Mercadona', amount: -62.18 }],
        isManual: false,
      },
      {
        id: 'acc-2',
        name: 'Cuenta ahorro',
        institution: 'Openbank',
        fn: 'Ahorro',
        balance: 10000,
        sharePercent: 100,
        currency: 'GBP',
        countsInAvailableToday: false,
        recentMovements: [],
        isManual: false,
      },
    ])
  })

  it('con varias filas de saldo para una misma cuenta, usa la marcada como principal, no una cualquiera', async () => {
    fixtures.accounts = [
      { id: 'acc-1', name: 'Nómina', product: null, connection_id: 'conn-1', account_function: 'gastar', currency: 'EUR', principal_balance_type: 'ITAV' },
    ]
    fixtures.balances = [
      { account_id: 'acc-1', amount_cents: 111100, balance_type: 'CLBD' },
      { account_id: 'acc-1', amount_cents: 222200, balance_type: 'ITAV' },
    ]
    fixtures.transactions = []
    useAuthStore.setState({ session: activeSession })
    const { result } = renderHook(() => useRealAccounts())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.accounts?.[0].balance).toBe(2222)
  })

  it('una cuenta "Para gastar" marcada como excluida no cuenta en Disponible hoy', async () => {
    fixtures.accounts = [
      { id: 'acc-1', name: 'Conjunta', product: null, connection_id: 'conn-1', account_function: 'gastar', currency: 'EUR', excluded_from_available: true },
    ]
    fixtures.balances = [{ account_id: 'acc-1', amount_cents: 100000 }]
    fixtures.transactions = []
    useAuthStore.setState({ session: activeSession })
    const { result } = renderHook(() => useRealAccounts())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.accounts?.[0].countsInAvailableToday).toBe(false)
  })
})
