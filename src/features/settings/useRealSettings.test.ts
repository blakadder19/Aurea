import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'

/** Query builder falso: soporta la cadena select().maybeSingle() y upsert(), como el real de supabase-js. */
function makeSupabaseMock(row: unknown, upsertError: { message: string } | null = null) {
  const upsertCalls: unknown[] = []
  const builder: Record<string, unknown> = {}
  builder.select = () => builder
  builder.maybeSingle = () => Promise.resolve({ data: row, error: null })
  builder.upsert = (payload: unknown) => {
    upsertCalls.push(payload)
    return Promise.resolve({ error: upsertError })
  }
  const mockFrom = vi.fn(() => builder)
  return { mockFrom, upsertCalls }
}

const activeSession = { user: { id: 'user-1' } } as unknown as Session

describe('useRealSettings', () => {
  it('sin sesión, devuelve settings=null sin consultar Supabase', async () => {
    vi.resetModules()
    const { mockFrom } = makeSupabaseMock(null)
    vi.doMock('../../lib/supabase/client', () => ({
      isSupabaseConfigured: true,
      supabase: { from: mockFrom, auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }), onAuthStateChange: vi.fn() } },
    }))
    const { useAuthStore } = await import('../../lib/supabase/useAuth')
    const { useRealSettings } = await import('./useRealSettings')

    useAuthStore.setState({ session: null })
    const { result } = renderHook(() => useRealSettings())
    expect(result.current.loading).toBe(false)
    expect(result.current.settings).toBeNull()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('con sesión y sin fila guardada todavía, usa los valores por defecto', async () => {
    vi.resetModules()
    const { mockFrom } = makeSupabaseMock(null)
    vi.doMock('../../lib/supabase/client', () => ({
      isSupabaseConfigured: true,
      supabase: { from: mockFrom, auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }), onAuthStateChange: vi.fn() } },
    }))
    const { useAuthStore } = await import('../../lib/supabase/useAuth')
    const { useRealSettings } = await import('./useRealSettings')

    useAuthStore.setState({ session: activeSession })
    const { result } = renderHook(() => useRealSettings())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.settings).toEqual({ currency: 'EUR (€)', dateFormat: 'DD/MM/AAAA', budgetMonthStart: 1 })
  })

  it('con sesión y una fila ya guardada, la usa tal cual', async () => {
    vi.resetModules()
    const { mockFrom } = makeSupabaseMock({ currency: 'USD ($)', date_format: 'MM/DD/AAAA', budget_month_start: 15 })
    vi.doMock('../../lib/supabase/client', () => ({
      isSupabaseConfigured: true,
      supabase: { from: mockFrom, auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }), onAuthStateChange: vi.fn() } },
    }))
    const { useAuthStore } = await import('../../lib/supabase/useAuth')
    const { useRealSettings } = await import('./useRealSettings')

    useAuthStore.setState({ session: activeSession })
    const { result } = renderHook(() => useRealSettings())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.settings).toEqual({ currency: 'USD ($)', dateFormat: 'MM/DD/AAAA', budgetMonthStart: 15 })
  })

  it('save() combina el cambio con lo ya cargado y hace upsert con user_id', async () => {
    vi.resetModules()
    const { mockFrom, upsertCalls } = makeSupabaseMock({ currency: 'EUR (€)', date_format: 'DD/MM/AAAA', budget_month_start: 1 })
    vi.doMock('../../lib/supabase/client', () => ({
      isSupabaseConfigured: true,
      supabase: { from: mockFrom, auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }), onAuthStateChange: vi.fn() } },
    }))
    const { useAuthStore } = await import('../../lib/supabase/useAuth')
    const { useRealSettings } = await import('./useRealSettings')

    useAuthStore.setState({ session: activeSession })
    const { result } = renderHook(() => useRealSettings())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let saveError: string | null = null
    await act(async () => {
      saveError = await result.current.save({ budgetMonthStart: 25 })
    })
    expect(saveError).toBeNull()
    expect(upsertCalls).toEqual([{ user_id: 'user-1', currency: 'EUR (€)', date_format: 'DD/MM/AAAA', budget_month_start: 25 }])
    expect(result.current.settings).toEqual({ currency: 'EUR (€)', dateFormat: 'DD/MM/AAAA', budgetMonthStart: 25 })
  })

  it('save() devuelve un mensaje de error si Supabase falla', async () => {
    vi.resetModules()
    const { mockFrom } = makeSupabaseMock({ currency: 'EUR (€)', date_format: 'DD/MM/AAAA', budget_month_start: 1 }, { message: 'boom' })
    vi.doMock('../../lib/supabase/client', () => ({
      isSupabaseConfigured: true,
      supabase: { from: mockFrom, auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }), onAuthStateChange: vi.fn() } },
    }))
    const { useAuthStore } = await import('../../lib/supabase/useAuth')
    const { useRealSettings } = await import('./useRealSettings')

    useAuthStore.setState({ session: activeSession })
    const { result } = renderHook(() => useRealSettings())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let saveError: string | null = null
    await act(async () => {
      saveError = await result.current.save({ currency: 'GBP (£)' })
    })
    expect(saveError).toBe('No hemos podido guardar el cambio. Inténtalo de nuevo.')
  })
})
