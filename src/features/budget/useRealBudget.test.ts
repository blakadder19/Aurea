import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import type { RealCategory } from '../transactions/useRealCategories'

/**
 * Query builder falso: cada método de encadenado se devuelve a sí mismo;
 * `then` resuelve el fixture de esa tabla — mismo patrón que
 * useRealAccounts.test.ts.
 */
function chainable(data: unknown[]) {
  const builder: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'neq', 'not', 'or', 'order', 'limit']) {
    builder[method] = () => builder
  }
  // oxlint-disable-next-line unicorn/no-thenable -- imita a propósito el query builder real de supabase-js.
  builder.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) => Promise.resolve(resolve({ data, error: null }))
  return builder
}

const fixtures: Record<string, unknown[]> = {
  budgets: [{ category_id: 'cat-1', amount_cents: 40000 }],
  transaction_category_amounts: [
    { category_id: 'cat-1', amount_cents: -31200 },
    { category_id: 'cat-1', amount_cents: -10000 },
    { category_id: 'cat-2', amount_cents: -5000 },
    { category_id: 'cat-1', amount_cents: 90000 }, // ingreso: no debe contar como gasto.
  ],
  // Pockets en otra divisa: sin filtro de fechas, FIFO los necesita enteros.
  transactions: [],
}

const categories: RealCategory[] = [
  { id: 'cat-1', name: 'Supermercado', icon: null, categoryGroup: 'alimentacion', parentId: null },
  { id: 'cat-2', name: 'Transporte', icon: null, categoryGroup: 'transporte', parentId: null },
]

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
const { useRealBudget, fetchPreviousCycleBudget } = await import('./useRealBudget')

describe('useRealBudget', () => {
  it('sin sesión, devuelve budget=null sin consultar Supabase', () => {
    useAuthStore.setState({ session: null })
    const { result } = renderHook(() => useRealBudget(categories, 1))
    expect(result.current.loading).toBe(false)
    expect(result.current.budget).toBeNull()
  })

  it('mientras las categorías siguen cargando (null), se queda en loading', () => {
    useAuthStore.setState({ session: activeSession })
    const { result } = renderHook(() => useRealBudget(null, 1))
    expect(result.current.loading).toBe(true)
    expect(result.current.budget).toBeNull()
  })

  it('mientras el inicio del mes presupuestario real todavía no se sabe (null), se queda en loading', () => {
    useAuthStore.setState({ session: activeSession })
    const { result } = renderHook(() => useRealBudget(categories, null))
    expect(result.current.loading).toBe(true)
    expect(result.current.budget).toBeNull()
  })

  it('con sesión, suma el gasto por categoría (solo importes negativos) y cruza con el presupuesto guardado', async () => {
    useAuthStore.setState({ session: activeSession })
    const { result } = renderHook(() => useRealBudget(categories, 1))

    await waitFor(() => expect(result.current.loading).toBe(false))

    const budget = result.current.budget!
    expect(budget.categories).toHaveLength(2)

    const supermercado = budget.categories.find((c) => c.categoryId === 'cat-1')!
    expect(supermercado.budgetedCents).toBe(40000)
    expect(supermercado.spentCents).toBe(41200) // 31200 + 10000, el ingreso de 90000 no cuenta.

    const transporte = budget.categories.find((c) => c.categoryId === 'cat-2')!
    expect(transporte.budgetedCents).toBe(0)
    expect(transporte.spentCents).toBe(5000)
    expect(transporte.expectedPaceCents).toBeNull() // sin presupuesto, no hay ritmo esperado.

    expect(budget.totalBudgetedCents).toBe(40000)
    expect(budget.totalSpentCents).toBe(46200)
  })

  it('con monthOffset != 0 (mes pasado o futuro), trata el ciclo como cerrado: ritmo esperado = presupuesto completo', async () => {
    useAuthStore.setState({ session: activeSession })
    const { result } = renderHook(() => useRealBudget(categories, 1, 1))

    await waitFor(() => expect(result.current.loading).toBe(false))

    const supermercado = result.current.budget!.categories.find((c) => c.categoryId === 'cat-1')!
    expect(supermercado.expectedPaceCents).toBe(supermercado.budgetedCents)
  })
})

describe('gasto en otra divisa', () => {
  const backup = {
    tca: fixtures.transaction_category_amounts,
    tx: fixtures.transactions,
  }
  afterEach(() => {
    fixtures.transaction_category_amounts = backup.tca
    fixtures.transactions = backup.tx
  })

  it('suma el gasto del pocket en euros por FIFO, no su cifra en la divisa', async () => {
    // 200,00 zł cambiados a 4,0 y 100,00 zł gastados = 25,00 €, no 100,00.
    fixtures.transaction_category_amounts = [{ transaction_id: 'gasto-pln', category_id: 'cat-1', amount_cents: -10_000 }]
    fixtures.transactions = [
      {
        id: 'cambio-pln',
        account_id: 'acc-pln',
        currency: 'PLN',
        amount_cents: 20_000,
        booking_date: '2026-08-01',
        value_date: null,
        exchange_rate: '4.0',
        exchange_rate_unit_currency: 'EUR',
      },
      {
        id: 'gasto-pln',
        account_id: 'acc-pln',
        currency: 'PLN',
        amount_cents: -10_000,
        booking_date: '2026-08-02',
        value_date: null,
        exchange_rate: null,
        exchange_rate_unit_currency: null,
      },
    ]
    useAuthStore.setState({ session: activeSession })
    const { result } = renderHook(() => useRealBudget(categories, 1, 1))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.budget!.categories.find((c) => c.categoryId === 'cat-1')!.spentCents).toBe(2_500)
    expect(result.current.budget!.uncoveredPocketSpend).toEqual([])
  })

  it('lo que no tiene cambio detrás queda fuera del total y se reporta aparte, nunca en silencio', async () => {
    // El caso real de la libra: 9,99 £ gastados y ningún cambio a libras.
    fixtures.transaction_category_amounts = [{ transaction_id: 'gasto-gbp', category_id: 'cat-1', amount_cents: -999 }]
    fixtures.transactions = [
      {
        id: 'gasto-gbp',
        account_id: 'acc-gbp',
        currency: 'GBP',
        amount_cents: -999,
        booking_date: '2026-08-02',
        value_date: null,
        exchange_rate: null,
        exchange_rate_unit_currency: null,
      },
    ]
    useAuthStore.setState({ session: activeSession })
    const { result } = renderHook(() => useRealBudget(categories, 1, 1))
    await waitFor(() => expect(result.current.loading).toBe(false))

    // No se estima: no suma ni un céntimo al total en euros...
    expect(result.current.budget!.totalSpentCents).toBe(0)
    // ...pero tampoco desaparece.
    expect(result.current.budget!.uncoveredPocketSpend).toEqual([{ currency: 'GBP', cents: 999 }])
  })
})

describe('fetchPreviousCycleBudget', () => {
  it('devuelve los importes en euros por categoría del ciclo anterior al indicado', async () => {
    const result = await fetchPreviousCycleBudget(1, 0)
    expect(result).toEqual({ 'cat-1': 400 })
  })

  it('sin presupuesto guardado ese ciclo, devuelve un objeto vacío', async () => {
    mockFrom.mockImplementationOnce(() => chainable([]))
    const result = await fetchPreviousCycleBudget(1, 0)
    expect(result).toEqual({})
  })
})
