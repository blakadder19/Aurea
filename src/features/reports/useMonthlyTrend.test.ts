import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'

function makeSupabaseMock(transactionRows: unknown[]) {
  function chainable(data: unknown[]) {
    const builder: Record<string, unknown> = {}
    for (const method of ['select', 'or', 'eq', 'order']) {
      builder[method] = () => builder
    }
    // oxlint-disable-next-line unicorn/no-thenable -- imita a propósito el query builder real de supabase-js.
    builder.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) => Promise.resolve(resolve({ data, error: null }))
    return builder
  }

  const mockFrom = vi.fn((table: string) => {
    if (table === 'transactions') return chainable(transactionRows)
    return chainable([]) // declared_incomes, sin ingresos declarados en estos tests.
  })

  return {
    mockFrom,
    supabaseMock: {
      from: mockFrom,
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }), onAuthStateChange: vi.fn() },
    },
  }
}

const activeSession = { user: { id: 'user-1' } } as unknown as Session

/** Fecha ISO relativa a hoy — nunca una fecha fija, para que el test no dependa de en qué día real se ejecuta. */
function isoForMonthsAgo(monthsAgo: number, day: number): string {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, day)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('useMonthlyTrend', () => {
  it('sin sesión, devuelve points=null sin consultar Supabase', async () => {
    vi.resetModules()
    const { supabaseMock, mockFrom } = makeSupabaseMock([])
    vi.doMock('../../lib/supabase/client', () => ({ isSupabaseConfigured: true, supabase: supabaseMock }))
    const { useAuthStore } = await import('../../lib/supabase/useAuth')
    const { useMonthlyTrend } = await import('./useMonthlyTrend')

    useAuthStore.setState({ session: null })
    const { result } = renderHook(() => useMonthlyTrend())
    expect(result.current.loading).toBe(false)
    expect(result.current.points).toBeNull()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('agrupa ingresos y gastos por mes a partir de booking_date, mes en curso excluido', async () => {
    vi.resetModules()
    const { supabaseMock } = makeSupabaseMock([
      { amount_cents: -3000, booking_date: isoForMonthsAgo(1, 5), value_date: null },
      { amount_cents: -2000, booking_date: isoForMonthsAgo(1, 20), value_date: null },
      { amount_cents: 150000, booking_date: isoForMonthsAgo(1, 1), value_date: null },
      { amount_cents: -1000, booking_date: isoForMonthsAgo(2, 10), value_date: null },
    ])
    vi.doMock('../../lib/supabase/client', () => ({ isSupabaseConfigured: true, supabase: supabaseMock }))
    const { useAuthStore } = await import('../../lib/supabase/useAuth')
    const { useMonthlyTrend } = await import('./useMonthlyTrend')

    useAuthStore.setState({ session: activeSession })
    const { result } = renderHook(() => useMonthlyTrend())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const points = result.current.points!
    expect(points).toHaveLength(6)

    const lastClosedMonth = points[points.length - 1]
    expect(lastClosedMonth.incomeCents).toBe(150000)
    expect(lastClosedMonth.expenseCents).toBe(5000)
    expect(lastClosedMonth.netCents).toBe(145000)

    const twoMonthsAgo = points[points.length - 2]
    expect(twoMonthsAgo.incomeCents).toBe(0)
    expect(twoMonthsAgo.expenseCents).toBe(1000)
  })

  it('un mes sin movimientos sigue apareciendo en 0, no se omite', async () => {
    vi.resetModules()
    const { supabaseMock } = makeSupabaseMock([{ amount_cents: -500, booking_date: isoForMonthsAgo(1, 1), value_date: null }])
    vi.doMock('../../lib/supabase/client', () => ({ isSupabaseConfigured: true, supabase: supabaseMock }))
    const { useAuthStore } = await import('../../lib/supabase/useAuth')
    const { useMonthlyTrend } = await import('./useMonthlyTrend')

    useAuthStore.setState({ session: activeSession })
    const { result } = renderHook(() => useMonthlyTrend())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.points).toHaveLength(6)
    expect(result.current.points!.every((p) => p.incomeCents === 0 && p.expenseCents >= 0)).toBe(true)
  })
})
