import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'

/**
 * Query builder falso: select/eq/order son no-op; `then` resuelve el
 * fixture — mismo patrón que useRealAccounts.test.ts.
 */
function chainable(data: unknown[]) {
  const builder: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'order']) {
    builder[method] = () => builder
  }
  // oxlint-disable-next-line unicorn/no-thenable -- imita a propósito el query builder real de supabase-js.
  builder.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) => Promise.resolve(resolve({ data, error: null }))
  return builder
}

const fixtures = {
  goals: [
    { id: 'goal-1', name: 'Viaje a Japón', target_cents: 400000, saved_cents: 215000, monthly_contribution_cents: 20000 },
    { id: 'goal-2', name: 'Fondo de emergencia', target_cents: 1188000, saved_cents: 890000, monthly_contribution_cents: 0 },
  ],
}

const mockFrom = vi.fn((table: string) => chainable(fixtures[table as keyof typeof fixtures] ?? []))

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
const { useRealGoals } = await import('./useRealGoals')

describe('useRealGoals', () => {
  it('sin sesión, devuelve goals=null sin consultar Supabase', () => {
    useAuthStore.setState({ session: null })
    const { result } = renderHook(() => useRealGoals())
    expect(result.current.loading).toBe(false)
    expect(result.current.goals).toBeNull()
  })

  it('con sesión, arma RealGoal[] a partir de goals', async () => {
    useAuthStore.setState({ session: activeSession })
    const { result } = renderHook(() => useRealGoals())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.goals).toEqual([
      { id: 'goal-1', name: 'Viaje a Japón', targetCents: 400000, savedCents: 215000, monthlyContributionCents: 20000, icon: null, color: null },
      { id: 'goal-2', name: 'Fondo de emergencia', targetCents: 1188000, savedCents: 890000, monthlyContributionCents: 0, icon: null, color: null },
    ])
  })

  it('con sesión, propaga icono y color de un objetivo personalizado', async () => {
    fixtures.goals = [
      {
        id: 'goal-1',
        name: 'Viaje a Japón',
        target_cents: 400000,
        saved_cents: 215000,
        monthly_contribution_cents: 20000,
        icon: '🗾',
        color: 'blue',
      },
    ] as unknown as typeof fixtures.goals
    useAuthStore.setState({ session: activeSession })
    const { result } = renderHook(() => useRealGoals())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.goals?.[0].icon).toBe('🗾')
    expect(result.current.goals?.[0].color).toBe('blue')
  })
})
