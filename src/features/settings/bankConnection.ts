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

/** Llama a `enable-banking-save` para resincronizar una conexión ya existente sin pasar por OAuth de nuevo. */
export async function syncBankConnection(): Promise<{ error: string | null; needsReconnect: boolean; transactionsNew: number | null }> {
  const token = await useAuthStore.getState().getAccessToken()
  if (!token) return { error: 'Inicia sesión primero.', needsReconnect: false, transactionsNew: null }

  const res = await fetch(`${FUNCTIONS_BASE}/enable-banking-save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  })
  const data = (await res.json().catch(() => ({}))) as { status?: string; transactionsNew?: number }
  if (!res.ok) return { error: 'No hemos podido sincronizar. Inténtalo de nuevo en unos minutos.', needsReconnect: false, transactionsNew: null }
  if (data.status === 'needs_reconnect') return { error: null, needsReconnect: true, transactionsNew: null }
  return { error: null, needsReconnect: false, transactionsNew: data.transactionsNew ?? 0 }
}

/** Llama a `enable-banking-disconnect`. No borra cuentas ni movimientos ya guardados, solo deja de sincronizar. */
export async function disconnectBank(): Promise<string | null> {
  const token = await useAuthStore.getState().getAccessToken()
  if (!token) return 'Inicia sesión primero.'

  const res = await fetch(`${FUNCTIONS_BASE}/enable-banking-disconnect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return 'No hemos podido desconectar el banco. Inténtalo de nuevo en unos minutos.'
  return null
}
