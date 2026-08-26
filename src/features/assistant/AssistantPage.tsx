import { useEffect } from 'react'
import { AnswerCard } from './AnswerCard'
import { buildAnswers } from './answers'
import { FreeformQuestion } from './FreeformQuestion'
import { SuggestedQuestions } from './SuggestedQuestions'
import { useAssistantStore } from './store'
import { useRealAnswers } from './useRealAnswers'
import { LoadingRealData } from '../../components/states/LoadingRealData'
import { useAuthStore } from '../../lib/supabase/useAuth'

function Header() {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line bg-surface px-4 py-5 lg:px-6 lg:py-4">
      <div>
        <h1 className="font-serif text-[32px] lg:text-[26px] font-semibold tracking-[-0.01em] text-ink">Asistente e insights</h1>
        <div className="mt-1 text-base text-ink-muted">Todo lo que responde muestra el cálculo o la fuente</div>
      </div>
    </header>
  )
}

/** Pantalla Asistente e insights: preguntas sugeridas con respuesta real, y campo de pregunta libre acotado. */
export function AssistantPage() {
  const selectedId = useAssistantStore((s) => s.selectedId)
  const clearFreeformHistory = useAssistantStore((s) => s.clearFreeformHistory)
  const session = useAuthStore((s) => s.session)
  const isAuthenticated = session !== null

  // Al cerrar sesión, la conversación libre no debe sobrevivir a la siguiente sesión que se abra en la misma pestaña.
  useEffect(() => {
    if (!isAuthenticated) clearFreeformHistory()
  }, [isAuthenticated, clearFreeformHistory])

  const { loading: loadingReal, answers: realAnswers, snapshot } = useRealAnswers()

  // Nunca mostrar las preguntas/respuestas de demo mientras las reales
  // todavía se están calculando a partir de tus datos.
  if (isAuthenticated && (loadingReal || realAnswers === null)) {
    return (
      <>
        <Header />
        <main className="flex max-w-[920px] flex-1 flex-col gap-6 overflow-y-auto p-4 lg:p-8">
          <LoadingRealData />
        </main>
      </>
    )
  }

  const answers = isAuthenticated ? realAnswers! : buildAnswers()
  const selectedAnswer = answers.find((a) => a.id === selectedId) ?? null

  return (
    <>
      <Header />
      <main className="flex max-w-[920px] flex-1 flex-col gap-6 overflow-y-auto p-4 lg:p-8">
        <SuggestedQuestions questions={isAuthenticated ? answers.map((a) => ({ id: a.id, question: a.question })) : undefined} />
        {selectedAnswer && <AnswerCard answer={selectedAnswer} />}
        <FreeformQuestion snapshot={isAuthenticated ? snapshot : undefined} />
      </main>
    </>
  )
}
