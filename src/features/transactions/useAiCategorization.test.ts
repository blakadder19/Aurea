import { describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/supabase/client', () => ({ isSupabaseConfigured: true, supabase: null }))

const { useAuthStore } = await import('../../lib/supabase/useAuth')
const { suggestCategories } = await import('./useAiCategorization')

describe('suggestCategories', () => {
  it('sin sesión, no llega a llamar a fetch', async () => {
    useAuthStore.setState({ getAccessToken: vi.fn().mockResolvedValue(null) })
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    const result = await suggestCategories()
    expect(result).toEqual({ suggestions: [], error: 'Inicia sesión de nuevo.' })
    expect(fetchSpy).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('con sesión, traduce transaction_id/category_id (snake_case) a camelCase, sin confidence tratado como alta', async () => {
    useAuthStore.setState({ getAccessToken: vi.fn().mockResolvedValue('token-123') })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ suggestions: [{ transaction_id: 'tx-1', category_id: 'cat-1' }] }),
      }),
    )

    const result = await suggestCategories()
    expect(result).toEqual({ suggestions: [{ transactionId: 'tx-1', categoryId: 'cat-1', confidence: 'alta' }], error: null })
    vi.unstubAllGlobals()
  })

  it('propaga confidence: "baja" cuando la IA no está segura', async () => {
    useAuthStore.setState({ getAccessToken: vi.fn().mockResolvedValue('token-123') })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ suggestions: [{ transaction_id: 'tx-1', category_id: 'cat-1', confidence: 'baja' }] }),
      }),
    )

    const result = await suggestCategories()
    expect(result.suggestions).toEqual([{ transactionId: 'tx-1', categoryId: 'cat-1', confidence: 'baja' }])
    vi.unstubAllGlobals()
  })

  it('si la Edge Function falla, devuelve un mensaje de error legible', async () => {
    useAuthStore.setState({ getAccessToken: vi.fn().mockResolvedValue('token-123') })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'anthropic_error' }) }))

    const result = await suggestCategories()
    expect(result.suggestions).toEqual([])
    expect(result.error).toBeTruthy()
    vi.unstubAllGlobals()
  })
})
