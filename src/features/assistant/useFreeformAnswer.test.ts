import { describe, expect, it, vi } from 'vitest'
import type { FinancialSnapshot } from './useRealAnswers'

vi.mock('../../lib/supabase/client', () => ({ isSupabaseConfigured: true, supabase: null }))

const { useAuthStore } = await import('../../lib/supabase/useAuth')
const { askFreeformQuestion } = await import('./useFreeformAnswer')

const snapshot: FinancialSnapshot = {
  todayIso: '2026-08-25',
  availableToday: -886.44,
  netWorth: 1806.27,
  assets: 1806.27,
  liabilities: 0,
  savingsRatePct: 14,
  budget: null,
  goals: [],
  debts: [],
}

describe('askFreeformQuestion', () => {
  it('sin sesión, no llega a llamar a fetch', async () => {
    useAuthStore.setState({ getAccessToken: vi.fn().mockResolvedValue(null) })
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const result = await askFreeformQuestion('¿Cuánto tengo disponible?', snapshot)
    expect(result).toEqual({ answer: null, error: 'Inicia sesión de nuevo.' })
    expect(fetchSpy).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('con sesión, devuelve la respuesta de la Edge Function', async () => {
    useAuthStore.setState({ getAccessToken: vi.fn().mockResolvedValue('token-123') })
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ answer: 'Tienes -886,44 € disponibles hoy.' }) })
    vi.stubGlobal('fetch', fetchSpy)

    const result = await askFreeformQuestion('¿Cuánto tengo disponible?', snapshot)
    expect(result).toEqual({ answer: 'Tienes -886,44 € disponibles hoy.', error: null })

    const [, options] = fetchSpy.mock.calls[0]
    const body = JSON.parse(options.body)
    expect(body.snapshot).toEqual(snapshot)
    expect(body.question).toBe('¿Cuánto tengo disponible?')
    vi.unstubAllGlobals()
  })

  it('si la Edge Function falla, devuelve un mensaje de error legible en vez de una respuesta fabricada', async () => {
    useAuthStore.setState({ getAccessToken: vi.fn().mockResolvedValue('token-123') })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'anthropic_error' }) }))

    const result = await askFreeformQuestion('¿Cuánto tengo disponible?', snapshot)
    expect(result.answer).toBeNull()
    expect(result.error).toBeTruthy()
    vi.unstubAllGlobals()
  })
})
