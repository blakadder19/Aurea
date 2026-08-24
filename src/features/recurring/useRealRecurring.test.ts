import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'

function chainable(data: unknown[]) {
  const builder: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'order', 'limit', 'in']) {
    builder[method] = () => builder
  }
  // oxlint-disable-next-line unicorn/no-thenable -- imita a propósito el query builder real de supabase-js.
  builder.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) => Promise.resolve(resolve({ data, error: null }))
  return builder
}

const fixtures = {
  transactions: [
    // Disney Plus: 3 cargos mensuales exactos, mismo importe → recurrente sin aviso.
    { account_id: 'acc-1', description: 'Disney Plus', amount_cents: -1199, booking_date: '2026-06-21', value_date: '2026-06-21', category_id: 'cat-subs' },
    { account_id: 'acc-1', description: 'Disney Plus', amount_cents: -1199, booking_date: '2026-07-21', value_date: '2026-07-21', category_id: 'cat-subs' },
    { account_id: 'acc-1', description: 'Disney Plus', amount_cents: -1199, booking_date: '2026-08-21', value_date: '2026-08-21', category_id: 'cat-subs' },
    // Spotify: sube de precio en el último cargo → highlight.
    { account_id: 'acc-1', description: 'Spotify', amount_cents: -1099, booking_date: '2026-07-24', value_date: '2026-07-24', category_id: 'cat-subs' },
    { account_id: 'acc-1', description: 'Spotify', amount_cents: -1199, booking_date: '2026-08-24', value_date: '2026-08-24', category_id: 'cat-subs' },
    // Deliveroo: comercio frecuente pero sin cadencia mensual → no debe salir.
    { account_id: 'acc-1', description: 'Deliveroo', amount_cents: -1355, booking_date: '2026-06-04', value_date: '2026-06-04', category_id: null },
    { account_id: 'acc-1', description: 'Deliveroo', amount_cents: -3791, booking_date: '2026-06-23', value_date: '2026-06-23', category_id: null },
  ],
  accounts: [{ id: 'acc-1', name: 'Nómina', connection_id: 'conn-1' }],
  categories: [{ id: 'cat-subs', category_group: 'suscripciones' }],
  bank_connections: [{ id: 'conn-1', aspsp_name: 'Openbank' }],
  recurring_dismissals: [],
}

const mockFrom = vi.fn((table: string) => chainable((fixtures as Record<string, unknown[]>)[table] ?? []))

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
const { useRealRecurring } = await import('./useRealRecurring')

describe('useRealRecurring', () => {
  it('sin sesión, devuelve items=null sin consultar Supabase', () => {
    useAuthStore.setState({ session: null })
    const { result } = renderHook(() => useRealRecurring())
    expect(result.current.loading).toBe(false)
    expect(result.current.items).toBeNull()
  })

  it('detecta recurrentes reales y descarta comercios frecuentes sin cadencia mensual', async () => {
    useAuthStore.setState({ session: activeSession })
    const { result } = renderHook(() => useRealRecurring())

    await waitFor(() => expect(result.current.loading).toBe(false))

    const names = result.current.items!.map((i) => i.name).sort()
    expect(names).toEqual(['Disney Plus', 'Spotify'])
  })

  it('marca Disney Plus como Suscripciones, con cuenta "Nómina · Openbank" y sin aviso', async () => {
    useAuthStore.setState({ session: activeSession })
    const { result } = renderHook(() => useRealRecurring())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const disney = result.current.items!.find((i) => i.name === 'Disney Plus')!
    expect(disney.category).toBe('suscripciones')
    expect(disney.account).toBe('Nómina · Openbank')
    expect(disney.amount).toBeCloseTo(11.99)
    expect(disney.highlight).toBeUndefined()
    expect(disney.history).toEqual([
      { date: '21 jul', amount: 11.99 },
      { date: '21 jun', amount: 11.99 },
    ])
  })

  it('marca Spotify con aviso de subida de precio', async () => {
    useAuthStore.setState({ session: activeSession })
    const { result } = renderHook(() => useRealRecurring())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const spotify = result.current.items!.find((i) => i.name === 'Spotify')!
    expect(spotify.highlight?.variant).toBe('warning')
    expect(spotify.highlight?.badge).toBe('Sube de precio')
  })
})
