import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'

/**
 * Query builder falso. El mes actual se lee de `transaction_category_amounts`
 * (la vista consciente de divisiones); el mes anterior, de `transactions`
 * directo (solo necesita el total, no la categoría).
 */
function makeSupabaseMock({
  categories,
  currentMonthRows,
  previousMonthRows,
}: {
  categories: unknown[]
  currentMonthRows: unknown[]
  previousMonthRows: unknown[] | null
}) {
  function chainable(data: unknown[]) {
    const builder: Record<string, unknown> = {}
    for (const method of ['select', 'or', 'eq', 'order']) {
      builder[method] = () => builder
    }
    // oxlint-disable-next-line unicorn/no-thenable -- imita a propósito el query builder real de supabase-js.
    builder.then = (resolve: (v: { data: unknown[] }) => unknown) => Promise.resolve(resolve({ data }))
    return builder
  }

  const mockFrom = vi.fn((table: string) => {
    if (table === 'categories') return chainable(categories)
    if (table === 'transaction_category_amounts') return chainable(currentMonthRows)
    if (table === 'transactions') return chainable(previousMonthRows ?? [])
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

describe('useRealMonthlyReport', () => {
  it('sin sesión, devuelve report=null sin consultar Supabase', async () => {
    vi.resetModules()
    const { supabaseMock, mockFrom } = makeSupabaseMock({ categories: [], currentMonthRows: [], previousMonthRows: [] })
    vi.doMock('../../lib/supabase/client', () => ({ isSupabaseConfigured: true, supabase: supabaseMock }))
    const { useAuthStore } = await import('../../lib/supabase/useAuth')
    const { useRealMonthlyReport } = await import('./useRealMonthlyReport')

    useAuthStore.setState({ session: null })
    const { result } = renderHook(() => useRealMonthlyReport(1))
    expect(result.current.loading).toBe(false)
    expect(result.current.report).toBeNull()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('un mes sin ningún movimiento devuelve report=null (no un informe vacío fabricado)', async () => {
    vi.resetModules()
    const { supabaseMock } = makeSupabaseMock({ categories: [], currentMonthRows: [], previousMonthRows: [] })
    vi.doMock('../../lib/supabase/client', () => ({ isSupabaseConfigured: true, supabase: supabaseMock }))
    const { useAuthStore } = await import('../../lib/supabase/useAuth')
    const { useRealMonthlyReport } = await import('./useRealMonthlyReport')

    useAuthStore.setState({ session: activeSession })
    const { result } = renderHook(() => useRealMonthlyReport(1))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.report).toBeNull()
  })

  it('con movimientos, agrega ingresos/gastos por categoría y compara con el mes anterior', async () => {
    vi.resetModules()
    const { supabaseMock } = makeSupabaseMock({
      categories: [{ id: 'cat-1', name: 'Restaurantes' }],
      currentMonthRows: [
        { category_id: 'cat-1', amount_cents: -3000 },
        { category_id: 'cat-1', amount_cents: -2000 },
        { category_id: null, amount_cents: -1000 },
        { category_id: null, amount_cents: 200000 }, // ingreso
      ],
      previousMonthRows: [{ amount_cents: -8000 }],
    })
    vi.doMock('../../lib/supabase/client', () => ({ isSupabaseConfigured: true, supabase: supabaseMock }))
    const { useAuthStore } = await import('../../lib/supabase/useAuth')
    const { useRealMonthlyReport } = await import('./useRealMonthlyReport')

    useAuthStore.setState({ session: activeSession })
    const { result } = renderHook(() => useRealMonthlyReport(1))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const report = result.current.report!
    expect(report.incomeCents).toBe(200000)
    expect(report.expenseCents).toBe(6000)
    expect(report.categories).toEqual([
      { name: 'Restaurantes', spentCents: 5000, pctOfTotal: expect.closeTo(83.33, 1) },
      { name: 'Sin clasificar', spentCents: 1000, pctOfTotal: expect.closeTo(16.67, 1) },
    ])
    expect(report.previousExpenseCents).toBe(8000)
    expect(report.expenseDeltaCents).toBe(-2000)
  })
})
