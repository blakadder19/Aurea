import { useState } from 'react'
import { Card } from '../../components/Card'
import { useAuthStore } from '../../lib/supabase/useAuth'
import { useAssistantStore } from './store'

/** Campo de pregunta libre: declara sus límites en vez de fingir una respuesta abierta. */
export function FreeformQuestion() {
  const [value, setValue] = useState('')
  const freeformSubmitted = useAssistantStore((s) => s.freeformSubmitted)
  const submitFreeform = useAssistantStore((s) => s.submitFreeform)
  const isAuthenticated = useAuthStore((s) => s.session !== null)

  return (
    <Card padding="lg" className="flex flex-col gap-3">
      <form
        className="flex flex-wrap items-center gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          submitFreeform()
        }}
      >
        <input
          aria-label="Escribe tu pregunta"
          placeholder="Escribe tu propia pregunta sobre tus finanzas…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="min-h-12 flex-1 rounded-md border border-line px-4 py-3 text-base text-ink"
        />
        <button
          type="submit"
          className="min-h-12 rounded-md border border-brand bg-brand px-5 py-3 text-base font-semibold text-surface hover:bg-brand-hover"
        >
          Preguntar
        </button>
      </form>
      {freeformSubmitted && (
        <p className="text-base text-ink-muted text-pretty">
          {isAuthenticated
            ? 'El asistente todavía solo responde a las preguntas sugeridas arriba: aún no hay una respuesta para preguntas escritas libremente.'
            : 'En esta demo, el asistente solo responde a las cuatro preguntas sugeridas arriba: aún no hay una respuesta para preguntas escritas libremente.'}
        </p>
      )}
    </Card>
  )
}
