import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import type { Account } from '../../data/accounts'

/** order()+limit() de verdad ordenan/recortan el array, para poder probar la consulta "más antiguo conocido". */
function chainable(data: Record<string, unknown>[]) {
  let result = data
  const builder: Record<string, unknown> = {}
  for (const method of ['select', 'in', 'or', 'gte']) {
    builder[method] = () => builder
  }
  builder.order = (column: string, opts?: { ascending?: boolean }) => {
    const dir = opts?.ascending === false ? -1 : 1
    result = [...result].sort((a, b) => {
      const av = (a[column] as string) ?? ''
      const bv = (b[column] as string) ?? ''
      return av < bv ? -dir : av > bv ? dir : 0
    })
    return builder
  }
  builder.limit = (n: number) => {
    result = result.slice(0, n)
    return builder
  }
  // oxlint-disable-next-line unicorn/no-thenable -- imita a propósito el query builder real de supabase-js.
  builder.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) => Promise.resolve(resolve({ data: result, error: null }))
  return builder
}

const fixtures: Record<string, Record<string, unknown>[]> = {
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

  it('con transacciones desde el inicio del periodo pedido, reconstruye la serie completa sin recortar', async () => {
    fixtures.transactions = [
      // Un movimiento anterior al periodo pedido demuestra que sí hay historial ahí — no se recorta.
      { account_id: 'acc-1', booking_date: '2026-07-01', value_date: null, amount_cents: 0 },
      { account_id: 'acc-1', booking_date: '2026-08-02', value_date: null, amount_cents: 20000 },
    ]
    useAuthStore.setState({ session: activeSession })
    const { result } = renderHook(() => useNetWorthHistory(accounts, 1000, '2026-08-01'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    const points = result.current.points!
    expect(points[0]).toEqual({ dateISO: '2026-08-01', netWorth: 800 })
    expect(points[points.length - 1].netWorth).toBe(1000)
  })

  it('si el movimiento más antiguo conocido es posterior al inicio pedido, recorta en vez de fabricar una línea plana', async () => {
    // Se pide desde el 01 ago, pero el movimiento más antiguo que existe de verdad es el 03 ago:
    // no se dibuja ningún punto del 01 ni del 02, en vez de fingir un patrimonio constante ahí.
    fixtures.transactions = [{ account_id: 'acc-1', booking_date: '2026-08-03', value_date: null, amount_cents: 10000 }]
    useAuthStore.setState({ session: activeSession })
    const { result } = renderHook(() => useNetWorthHistory(accounts, 1000, '2026-08-01'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    const points = result.current.points!
    expect(points[0].dateISO).toBe('2026-08-03')
    expect(points.some((p) => p.dateISO === '2026-08-01' || p.dateISO === '2026-08-02')).toBe(false)
  })
})
