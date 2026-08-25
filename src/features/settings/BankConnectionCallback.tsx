import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../../components/Card'
import { supabase } from '../../lib/supabase/client'
import { useAuthStore } from '../../lib/supabase/useAuth'

const FUNCTIONS_BASE = supabase ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1` : ''

type Status = 'working' | 'error'

/**
 * Ruta /ajustes/banco/callback: a donde Enable Banking redirige tras la
 * autorización. Requiere que la sesión de Supabase ya esté activa en este
 * navegador (el flujo entero ocurre en la misma pestaña).
 */
export function BankConnectionCallback() {
  const [status, setStatus] = useState<Status>('working')
  const [message, setMessage] = useState('Conectando tu banco…')
  const getAccessToken = useAuthStore((s) => s.getAccessToken)
  const navigate = useNavigate()

  useEffect(() => {
    async function run() {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const state = params.get('state')
      const authError = params.get('error')

      if (authError) {
        setStatus('error')
        setMessage('El banco no autorizó la conexión.')
        return
      }
      if (!code || !state) {
        setStatus('error')
        setMessage('Faltan parámetros en la respuesta del banco.')
        return
      }

      const token = await getAccessToken()
      if (!token) {
        setStatus('error')
        setMessage('Tu sesión ha caducado. Vuelve a entrar e inténtalo de nuevo.')
        return
      }

      const res = await fetch(`${FUNCTIONS_BASE}/enable-banking-callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code, state }),
      })
      const data = (await res.json().catch(() => ({}))) as { status?: string; error?: string }

      if (!res.ok || data.status === 'needs_reconnect') {
        setStatus('error')
        setMessage('No hemos podido completar la conexión. Inténtalo de nuevo desde Ajustes.')
        return
      }

      navigate('/cuentas', { replace: true })
    }
    run()
  }, [getAccessToken, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <Card padding="lg" className="flex w-full max-w-[420px] flex-col gap-3.5 text-center">
        <div className="font-serif text-[22px] font-semibold text-ink">{message}</div>
        {status === 'error' && (
          <a href="/ajustes" className="text-base font-semibold text-brand">
            Volver a Ajustes
          </a>
        )}
      </Card>
    </div>
  )
}
