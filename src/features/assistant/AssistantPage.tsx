import { AnswerCard } from './AnswerCard'
import { buildAnswers } from './answers'
import { FreeformQuestion } from './FreeformQuestion'
import { SuggestedQuestions } from './SuggestedQuestions'
import { useAssistantStore } from './store'

function Header() {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line bg-surface px-4 py-5 lg:px-8">
      <div>
        <h1 className="font-serif text-[32px] font-semibold tracking-[-0.01em] text-ink">Asistente e insights</h1>
        <div className="mt-1 text-base text-ink-muted">Todo lo que responde muestra el cálculo o la fuente</div>
      </div>
    </header>
  )
}

/** Pantalla Asistente e insights: preguntas sugeridas con respuesta real, y campo de pregunta libre acotado. */
export function AssistantPage() {
  const selectedId = useAssistantStore((s) => s.selectedId)
  const answers = buildAnswers()
  const selectedAnswer = answers.find((a) => a.id === selectedId) ?? null

  return (
    <>
      <Header />
      <main className="flex max-w-[920px] flex-1 flex-col gap-6 overflow-y-auto p-4 lg:p-8">
        <SuggestedQuestions />
        {selectedAnswer && <AnswerCard answer={selectedAnswer} />}
        <FreeformQuestion />
      </main>
    </>
  )
}
