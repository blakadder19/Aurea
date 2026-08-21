import { useState, type FormEvent } from 'react'
import { Card } from '../../components/Card'
import { isSupabaseConfigured } from '../../lib/supabase/client'
import { useAuthStore } from '../../lib/supabase/useAuth'

/** Ruta /entrar: acceso con enlace mágico por email. Fuera del AppShell — no hay nada que navegar todavía. */
export function LoginPage() {
  const [email, setEmail] = useState('')
  const magicLinkSentTo = useAuthStore((s) => s.magicLinkSentTo)
  const requestError = useAuthStore((s) => s.requestError)
  const sendMagicLink = useAuthStore((s) => s.sendMagicLink)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (email.trim()) sendMagicLink(email.trim())
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <Card padding="lg" className="flex w-full max-w-[420px] flex-col gap-5">
        <div>
          <div className="font-serif text-[28px] font-bold text-ink">Áurea</div>
          <div className="mt-0.5 text-base text-ink-muted">Entra con tu email para ver tus datos reales</div>
        </div>

        {!isSupabaseConfigured ? (
          <p className="text-base text-ink-muted text-pretty">
            El acceso real no está configurado en este entorno. Puedes seguir explorando la demostración sin
            iniciar sesión.
          </p>
        ) : magicLinkSentTo ? (
          <p className="text-base text-ink text-pretty">
            Te hemos enviado un enlace a <strong>{magicLinkSentTo}</strong>. Ábrelo desde este mismo navegador para
            entrar.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <label className="flex flex-col gap-1.5">
              <span className="text-[15px] font-semibold text-ink">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="min-h-11 rounded-md border border-line px-3.5 text-base text-ink"
              />
            </label>
            {requestError && <p className="text-[15px] text-danger-text">{requestError}</p>}
            <button
              type="submit"
              className="min-h-11 rounded-md border border-green bg-green px-[18px] text-base font-semibold text-surface hover:bg-green-hover"
            >
              Enviarme el enlace
            </button>
          </form>
        )}
      </Card>
    </div>
  )
}
