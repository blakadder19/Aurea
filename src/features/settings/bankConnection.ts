import { isSupabaseConfigured } from '../../lib/supabase/client'
import { useAuthStore } from '../../lib/supabase/useAuth'

const FUNCTIONS_BASE = isSupabaseConfigured ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1` : ''

/** Llama a `enable-banking-connect` y navega a la URL de autorización del banco. */
export async function startBankConnection(): Promise<string | null> {
  const token = await useAuthStore.getState().getAccessToken()
  if (!token) return 'Inicia sesión primero para conectar tu banco.'

  const res = await fetch(`${FUNCTIONS_BASE}/enable-banking-connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  })
  const data = (await res.json().catch(() => ({}))) as { authUrl?: string; error?: string }

  if (!res.ok || !data.authUrl) {
    return 'No hemos podido iniciar la conexión con el banco. Inténtalo de nuevo en unos minutos.'
  }

  window.location.href = data.authUrl
  return null
}
