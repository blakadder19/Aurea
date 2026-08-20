import { useState } from 'react'
import { Card } from '../../components/Card'
import { useAssistantStore } from './store'

/** Campo de pregunta libre: declara sus límites en la demo en vez de fingir una respuesta abierta. */
export function FreeformQuestion() {
  const [value, setValue] = useState('')
  const freeformSubmitted = useAssistantStore((s) => s.freeformSubmitted)
  const submitFreeform = useAssistantStore((s) => s.submitFreeform)

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
          className="min-h-12 rounded-md border border-green bg-green px-5 py-3 text-base font-semibold text-surface hover:bg-green-hover"
        >
          Preguntar
        </button>
      </form>
      {freeformSubmitted && (
        <p className="text-base text-ink-muted text-pretty">
          En esta demo, el asistente solo responde a las cuatro preguntas sugeridas arriba: aún no hay una respuesta
          para preguntas escritas libremente.
        </p>
      )}
    </Card>
  )
}
