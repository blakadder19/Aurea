import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'

function chainable(data: unknown[]) {
  const builder: Record<string, unknown> = {}
  builder.select = () => builder
  builder.order = () => builder
  builder.eq = () => builder
  builder.delete = () => builder
  // oxlint-disable-next-line unicorn/no-thenable -- imita a propósito el query builder real de supabase-js.
  builder.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) => Promise.resolve(resolve({ data, error: null }))
  return builder
}

let rulesFixture: unknown[] = []
const mockFrom = vi.fn((table: string) => {
  if (table === 'rules') return chainable(rulesFixture)
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
const { useRealRules, deleteRule } = await import('./useRealRules')

describe('useRealRules', () => {
  it('sin sesión, devuelve rules=null sin consultar Supabase', () => {
    useAuthStore.setState({ session: null })
    const { result } = renderHook(() => useRealRules())
    expect(result.current.loading).toBe(false)
    expect(result.current.rules).toBeNull()
  })

  it('con sesión, devuelve las reglas mapeadas a camelCase', async () => {
    rulesFixture = [{ id: 'rule-1', match_value: 'Mercadona', category_id: 'cat-1' }]
    useAuthStore.setState({ session: activeSession })
    const { result } = renderHook(() => useRealRules())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.rules).toEqual([{ id: 'rule-1', matchValue: 'Mercadona', categoryId: 'cat-1' }])
  })
})

describe('deleteRule', () => {
  it('borra la regla sin error', async () => {
    const result = await deleteRule('rule-1')
    expect(result).toBeNull()
  })
})
