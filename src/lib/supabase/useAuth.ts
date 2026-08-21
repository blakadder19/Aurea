import type { Session } from '@supabase/supabase-js'
import { create } from 'zustand'
import { isSupabaseConfigured, supabase } from './client'

interface AuthState {
  session: Session | null
  /** false hasta que se resuelve la sesión inicial (evita parpadeo demo→real al cargar). */
  loading: boolean
  magicLinkSentTo: string | null
  requestError: string | null
  sendMagicLink: (email: string) => Promise<void>
  signOut: () => Promise<void>
  getAccessToken: () => Promise<string | null>
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  loading: isSupabaseConfigured,
  magicLinkSentTo: null,
  requestError: null,

  sendMagicLink: async (email) => {
    if (!supabase) return
    set({ requestError: null })
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) {
      set({ requestError: error.message })
      return
    }
    set({ magicLinkSentTo: email })
  },

  signOut: async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  },

  getAccessToken: async () => {
    if (!supabase) return null
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  },
}))

if (supabase) {
  supabase.auth.getSession().then(({ data }) => {
    useAuthStore.setState({ session: data.session, loading: false })
  })
  supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.setState({ session, loading: false })
  })
}
