import { useState, type FormEvent } from 'react'
import { Badge } from '../../components/Badge'
import { Card } from '../../components/Card'
import { useAuthStore } from '../../lib/supabase/useAuth'
import { useAssistantStore } from './store'
import { askFreeformQuestion } from './useFreeformAnswer'
import type { FinancialSnapshot } from './useRealAnswers'

/**
 * Campo de pregunta libre. En demo, declara sus límites en vez de fingir una
 * respuesta abierta. Con sesión real, sí responde — pero llamando a la IA
 * con tus datos reales ya calculados (nunca inventados por el modelo), y
 * dejando clarísimo que es una respuesta generada, no un cálculo exacto
 * como las cuatro preguntas sugeridas.
 */
export function FreeformQuestion({ snapshot }: { snapshot?: FinancialSnapshot | null } = {}) {
  const [value, setValue] = useState('')
  const freeformSubmitted = useAssistantStore((s) => s.freeformSubmitted)
  const submitFreeform = useAssistantStore((s) => s.submitFreeform)
  const freeformHistory = useAssistantStore((s) => s.freeformHistory)
  const addFreeformTurn = useAssistantStore((s) => s.addFreeformTurn)
  const clearFreeformHistory = useAssistantStore((s) => s.clearFreeformHistory)
  const isAuthenticated = useAuthStore((s) => s.session !== null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!isAuthenticated) {
      submitFreeform()
      return
    }
    if (!snapshot || !value.trim()) return
    setLoading(true)
    setError(null)
    const question = value.trim()
    const result = await askFreeformQuestion(question, snapshot, freeformHistory)
    setLoading(false)
    if (result.error) setError(result.error)
    else if (result.answer) {
      addFreeformTurn({ question, answer: result.answer })
      setValue('')
    }
  }

  return (
    <Card padding="lg" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <form className="flex flex-1 flex-wrap items-center gap-4" onSubmit={(e) => void handleSubmit(e)}>
          <input
            aria-label="Escribe tu pregunta"
            placeholder={isAuthenticated && !snapshot ? 'Cargando tus datos…' : 'Escribe tu propia pregunta sobre tus finanzas…'}
            value={value}
            disabled={isAuthenticated && (!snapshot || loading)}
            onChange={(e) => setValue(e.target.value)}
            className="min-h-12 flex-1 rounded-md border border-line px-4 py-3 text-base text-ink disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={isAuthenticated && (!snapshot || loading)}
            className="min-h-12 rounded-md border border-brand bg-brand px-5 py-3 text-base font-semibold text-surface hover:bg-brand-hover disabled:opacity-60"
          >
            {loading ? 'Pensando…' : 'Preguntar'}
          </button>
        </form>
        {isAuthenticated && freeformHistory.length > 0 && (
          <button
            type="button"
            onClick={clearFreeformHistory}
            className="text-sm font-semibold text-ink-muted underline hover:no-underline"
          >
            Nueva conversación
          </button>
        )}
      </div>

      {isAuthenticated && freeformHistory.length > 0 && (
        <div className="flex flex-col gap-4 border-t border-line pt-3.5">
          {freeformHistory.map((turn, i) => (
            <div key={i} className="flex flex-col gap-2.5">
              <div className="text-base text-ink-muted italic">Preguntaste: «{turn.question}»</div>
              <Badge variant="plum" icon="">
                Respuesta generada por IA a partir de tus datos reales
              </Badge>
              <p className="text-base text-ink text-pretty">{turn.answer}</p>
            </div>
          ))}
        </div>
      )}

      {isAuthenticated && error && <p className="text-base text-danger-text text-pretty">{error}</p>}

      {!isAuthenticated && freeformSubmitted && (
        <p className="text-base text-ink-muted text-pretty">
          En esta demo, el asistente solo responde a las cuatro preguntas sugeridas arriba: aún no hay una respuesta para preguntas escritas libremente.
        </p>
      )}
    </Card>
  )
}
