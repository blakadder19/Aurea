import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'

function makeSupabaseMock(categories: unknown[], rows: unknown[]) {
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
    if (table === 'categories') return chainable(categories)
    if (table === 'transaction_category_amounts') return chainable(rows)
    return chainable([])
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

describe('useCategoryTrend', () => {
  it('sin sesión, devuelve result=null sin consultar Supabase', async () => {
    vi.resetModules()
    const { supabaseMock, mockFrom } = makeSupabaseMock([], [])
    vi.doMock('../../lib/supabase/client', () => ({ isSupabaseConfigured: true, supabase: supabaseMock }))
    const { useAuthStore } = await import('../../lib/supabase/useAuth')
    const { useCategoryTrend } = await import('./useCategoryTrend')

    useAuthStore.setState({ session: null })
    const { result } = renderHook(() => useCategoryTrend())
    expect(result.current.loading).toBe(false)
    expect(result.current.result).toBeNull()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('agrupa el gasto por categoría y por mes de los últimos 6 meses cerrados', async () => {
    vi.resetModules()
    const { supabaseMock } = makeSupabaseMock(
      [{ id: 'cat-1', name: 'Supermercado' }],
      [
        { category_id: 'cat-1', amount_cents: -3000, booking_date: isoForMonthsAgo(1, 5), value_date: null },
        { category_id: 'cat-1', amount_cents: -2000, booking_date: isoForMonthsAgo(2, 5), value_date: null },
        { category_id: null, amount_cents: -1000, booking_date: isoForMonthsAgo(1, 6), value_date: null },
        { category_id: 'cat-1', amount_cents: 200000, booking_date: isoForMonthsAgo(1, 1), value_date: null }, // ingreso, se ignora
      ],
    )
    vi.doMock('../../lib/supabase/client', () => ({ isSupabaseConfigured: true, supabase: supabaseMock }))
    const { useAuthStore } = await import('../../lib/supabase/useAuth')
    const { useCategoryTrend } = await import('./useCategoryTrend')

    useAuthStore.setState({ session: activeSession })
    const { result } = renderHook(() => useCategoryTrend())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const trend = result.current.result!
    expect(trend.monthLabels).toHaveLength(6)

    const supermercado = trend.rows.find((r) => r.categoryId === 'cat-1')!
    expect(supermercado.totalSpentCents).toBe(5000)
    expect(supermercado.spentCentsByMonth[trend.monthLabels.length - 1]).toBe(3000) // hace 1 mes
    expect(supermercado.spentCentsByMonth[trend.monthLabels.length - 2]).toBe(2000) // hace 2 meses

    const sinClasificar = trend.rows.find((r) => r.categoryId === null)!
    expect(sinClasificar.totalSpentCents).toBe(1000)
  })
})
