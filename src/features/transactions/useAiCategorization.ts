import { isSupabaseConfigured } from '../../lib/supabase/client'
import { useAuthStore } from '../../lib/supabase/useAuth'

const FUNCTIONS_BASE = isSupabaseConfigured ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1` : ''

export interface AiCategorySuggestion {
  transactionId: string
  categoryId: string
  /** 'baja' cuando la IA no está del todo segura — se muestra distinto y nunca entra en un "aceptar todas". */
  confidence: 'alta' | 'baja'
}

/**
 * Pide a la Edge Function `ai-suggest-categories` una sugerencia de
 * categoría para tus movimientos sin clasificar más recientes. Nunca
 * escribe nada por sí sola — el cliente decide si acepta cada sugerencia
 * (misma lógica que ya usa `updateTransactionCategory`).
 */
export async function suggestCategories(): Promise<{ suggestions: AiCategorySuggestion[]; error: string | null }> {
  const token = await useAuthStore.getState().getAccessToken()
  if (!token) return { suggestions: [], error: 'Inicia sesión de nuevo.' }

  const res = await fetch(`${FUNCTIONS_BASE}/ai-suggest-categories`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = (await res.json().catch(() => ({}))) as {
    suggestions?: { transaction_id: string; category_id: string; confidence?: 'alta' | 'baja' }[]
    error?: string
  }

  if (!res.ok) {
    return { suggestions: [], error: 'No hemos podido sugerir categorías. Inténtalo de nuevo en unos minutos.' }
  }
  return {
    suggestions: (data.suggestions ?? []).map((s) => ({
      transactionId: s.transaction_id,
      categoryId: s.category_id,
      confidence: s.confidence === 'baja' ? 'baja' : 'alta',
    })),
    error: null,
  }
}
