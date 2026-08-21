import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockSignInWithOtp = vi.fn().mockResolvedValue({ error: null })
const mockSignOut = vi.fn().mockResolvedValue({ error: null })
const mockGetSession = vi.fn().mockResolvedValue({ data: { session: null } })
const mockOnAuthStateChange = vi.fn()

vi.mock('./client', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      signInWithOtp: mockSignInWithOtp,
      signOut: mockSignOut,
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
  },
}))

const { useAuthStore } = await import('./useAuth')

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ session: null, loading: false, magicLinkSentTo: null, requestError: null })
    mockSignInWithOtp.mockClear()
    mockSignOut.mockClear()
  })

  it('sendMagicLink llama a signInWithOtp y guarda el email al que se envió', async () => {
    await useAuthStore.getState().sendMagicLink('marta@example.com')
    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: 'marta@example.com',
      options: { emailRedirectTo: expect.any(String) },
    })
    expect(useAuthStore.getState().magicLinkSentTo).toBe('marta@example.com')
    expect(useAuthStore.getState().requestError).toBeNull()
  })

  it('sendMagicLink guarda el error de Supabase en vez de marcar el enlace como enviado', async () => {
    mockSignInWithOtp.mockResolvedValueOnce({ error: { message: 'Demasiados intentos, espera un momento.' } })
    await useAuthStore.getState().sendMagicLink('marta@example.com')
    expect(useAuthStore.getState().requestError).toBe('Demasiados intentos, espera un momento.')
    expect(useAuthStore.getState().magicLinkSentTo).toBeNull()
  })

  it('signOut llama a supabase.auth.signOut', async () => {
    await useAuthStore.getState().signOut()
    expect(mockSignOut).toHaveBeenCalled()
  })
})
