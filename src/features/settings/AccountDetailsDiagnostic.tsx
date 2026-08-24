import { useState } from 'react'
import { isSupabaseConfigured } from '../../lib/supabase/client'
import { useAuthStore } from '../../lib/supabase/useAuth'

const FUNCTIONS_BASE = isSupabaseConfigured ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1` : ''

/**
 * TEMPORAL — no es una pantalla del producto, solo para investigar si el
 * JSON crudo de Enable Banking distingue un Pocket de Revolut de una cuenta
 * normal. Quitar este archivo y su uso en SettingsPage una vez resuelto.
 */
export function AccountDetailsDiagnostic() {
  const session = useAuthStore((s) => s.session)
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!session) return null

  async function handleRun() {
    setLoading(true)
    setError(null)
    setResult(null)
    const token = await useAuthStore.getState().getAccessToken()
    if (!token) {
      setError('No hay token de acceso.')
      setLoading(false)
      return
    }
    try {
      const res = await fetch(`${FUNCTIONS_BASE}/diagnostics-account-details`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({ error: 'respuesta no-JSON' }))
      setResult(JSON.stringify(data, null, 2))
    } catch {
      setError('Fallo de red al llamar al diagnóstico.')
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4">
      <div className="text-base font-semibold text-ink">Diagnóstico temporal: detalle crudo de Enable Banking</div>
      <button
        type="button"
        disabled={loading}
        onClick={() => void handleRun()}
        className="min-h-11 w-fit rounded-md border border-green bg-green px-[18px] text-base font-semibold text-surface hover:bg-green-hover"
      >
        {loading ? 'Consultando…' : 'Ejecutar diagnóstico'}
      </button>
      {error && <p className="text-sm text-danger-text">{error}</p>}
      {result && <pre className="max-h-96 overflow-auto rounded-md bg-canvas p-3 text-xs whitespace-pre-wrap select-all">{result}</pre>}
    </div>
  )
}
