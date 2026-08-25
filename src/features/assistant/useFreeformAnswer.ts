import { isSupabaseConfigured } from '../../lib/supabase/client'
import { useAuthStore } from '../../lib/supabase/useAuth'
import type { FinancialSnapshot } from './useRealAnswers'

const FUNCTIONS_BASE = isSupabaseConfigured ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1` : ''

/**
 * Pregunta libre sobre tus datos reales: llama a `ai-freeform-answer` con el
 * snapshot ya calculado (nunca lo recalcula el servidor por su cuenta, para
 * no tener dos implementaciones del mismo cálculo que puedan desincronizarse).
 */
export async function askFreeformQuestion(question: string, snapshot: FinancialSnapshot): Promise<{ answer: string | null; error: string | null }> {
  const token = await useAuthStore.getState().getAccessToken()
  if (!token) return { answer: null, error: 'Inicia sesión de nuevo.' }

  const res = await fetch(`${FUNCTIONS_BASE}/ai-freeform-answer`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, snapshot }),
  })
  const data = (await res.json().catch(() => ({}))) as { answer?: string; error?: string }

  if (!res.ok || typeof data.answer !== 'string') {
    return { answer: null, error: 'No hemos podido responder ahora mismo. Inténtalo de nuevo en unos minutos.' }
  }
  return { answer: data.answer, error: null }
}
