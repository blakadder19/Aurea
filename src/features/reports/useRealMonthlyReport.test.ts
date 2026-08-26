import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'

/**
 * Query builder falso. `transactions` se consulta dos veces por render (mes
 * actual, luego mes anterior) — la mock devuelve `currentMonthRows` la
 * primera vez y `previousMonthRows` la segunda, en el mismo orden en que el
 * hook las pide dentro del Promise.all.
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
  let transactionsCallCount = 0

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
    if (table === 'transactions') {
      transactionsCallCount += 1
      return chainable(transactionsCallCount === 1 ? currentMonthRows : (previousMonthRows ?? []))
    }
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
