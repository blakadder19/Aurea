import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import type { Account } from '../../data/accounts'

function chainable(data: unknown[]) {
  const builder: Record<string, unknown> = {}
  for (const method of ['select', 'in', 'or']) {
    builder[method] = () => builder
  }
  // oxlint-disable-next-line unicorn/no-thenable -- imita a propósito el query builder real de supabase-js.
  builder.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) => Promise.resolve(resolve({ data, error: null }))
  return builder
}

const fixtures: Record<string, unknown[]> = {
  transactions: [{ account_id: 'acc-1', booking_date: '2026-08-02', value_date: null, amount_cents: 20000 }],
}

const mockFrom = vi.fn((table: string) => chainable(fixtures[table] ?? []))

vi.mock('../../lib/supabase/client', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: (table: string) => mockFrom(table),
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }), onAuthStateChange: vi.fn() },
  },
}))

const activeSession = { user: { id: 'user-1' } } as unknown as Session
const accounts: Account[] = [
  { id: 'acc-1', name: 'Nómina', institution: 'Revolut', fn: 'Para gastar', balance: 1000, sharePercent: 100, countsInAvailableToday: true, recentMovements: [] },
]

const { useAuthStore } = await import('../../lib/supabase/useAuth')
const { useNetWorthHistory } = await import('./useNetWorthHistory')

describe('useNetWorthHistory', () => {
  it('sin sesión, devuelve points=null sin consultar Supabase', () => {
    useAuthStore.setState({ session: null })
    const { result } = renderHook(() => useNetWorthHistory(accounts, 1000, '2026-08-01'))
    expect(result.current.loading).toBe(false)
    expect(result.current.points).toBeNull()
  })

  it('mientras el inicio del periodo no se sabe (null), se queda en loading', () => {
    useAuthStore.setState({ session: activeSession })
    const { result } = renderHook(() => useNetWorthHistory(accounts, 1000, null))
    expect(result.current.loading).toBe(true)
    expect(result.current.points).toBeNull()
  })

  it('con sesión, reconstruye la serie a partir del patrimonio actual y las transacciones', async () => {
    useAuthStore.setState({ session: activeSession })
    const { result } = renderHook(() => useNetWorthHistory(accounts, 1000, '2026-08-01'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    const points = result.current.points!
    expect(points[0]).toEqual({ dateISO: '2026-08-01', netWorth: 800 })
    expect(points[points.length - 1].netWorth).toBe(1000)
  })
})
