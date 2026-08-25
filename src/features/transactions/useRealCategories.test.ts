import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'

/**
 * Query builder falso: select/order son no-op; upsert() sustituye los datos
 * por las filas sembradas (con id sintético) — así el mismo builder sirve
 * para "ya tenía categorías" y para "las siembra porque no tenía ninguna".
 */
function chainable(initialData: unknown[]) {
  let data = initialData
  const builder: Record<string, unknown> = {}
  builder.select = () => builder
  builder.order = () => builder
  builder.upsert = (rows: { name: string; category_group: string; icon?: string }[]) => {
    data = rows.map((r, i) => ({ id: `seed-${i}`, name: r.name, icon: r.icon ?? null }))
    return builder
  }
  // oxlint-disable-next-line unicorn/no-thenable -- imita a propósito el query builder real de supabase-js.
  builder.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) => Promise.resolve(resolve({ data, error: null }))
  return builder
}

let categoriesFixture: unknown[] = []
const mockFrom = vi.fn((table: string) => {
  if (table === 'categories') return chainable(categoriesFixture)
  throw new Error(`tabla inesperada en el mock: ${table}`)
})

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
const { useRealCategories, categoryLabel } = await import('./useRealCategories')

describe('useRealCategories', () => {
  it('sin sesión, devuelve categories=null sin consultar Supabase', () => {
    useAuthStore.setState({ session: null })
    const { result } = renderHook(() => useRealCategories())
    expect(result.current.loading).toBe(false)
    expect(result.current.categories).toBeNull()
  })

  it('con categorías existentes, las devuelve tal cual sin sembrar nada', async () => {
    categoriesFixture = [
      { id: 'cat-1', name: 'Ingresos' },
      { id: 'cat-2', name: 'Transporte' },
    ]
    useAuthStore.setState({ session: activeSession })
    const { result } = renderHook(() => useRealCategories())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.categories).toEqual([
      { id: 'cat-1', name: 'Ingresos' },
      { id: 'cat-2', name: 'Transporte' },
    ])
  })

  it('sin categorías, siembra el catálogo por defecto (9 categorías)', async () => {
    categoriesFixture = []
    useAuthStore.setState({ session: activeSession })
    const { result } = renderHook(() => useRealCategories())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.categories).toHaveLength(9)
    expect(result.current.categories?.map((c) => c.name)).toContain('Supermercado')
    expect(result.current.categories?.map((c) => c.name)).toContain('Ingresos')
    expect(result.current.categories?.find((c) => c.name === 'Supermercado')?.icon).toBe('🛒')
  })
})

describe('categoryLabel', () => {
  it('antepone el icono cuando existe', () => {
    expect(categoryLabel({ name: 'Supermercado', icon: '🛒' })).toBe('🛒 Supermercado')
  })

  it('usa solo el nombre cuando no hay icono', () => {
    expect(categoryLabel({ name: 'Supermercado', icon: null })).toBe('Supermercado')
  })
})
