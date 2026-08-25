import { SUGGESTED_QUESTIONS } from './answers'
import { useAssistantStore } from './store'

/** Preguntas sugeridas como botones grandes, texto completo, sin truncar. */
export function SuggestedQuestions() {
  const selectedId = useAssistantStore((s) => s.selectedId)
  const askQuestion = useAssistantStore((s) => s.askQuestion)

  return (
    <div className="flex flex-wrap gap-3">
      {SUGGESTED_QUESTIONS.map((q) => (
        <button
          key={q.id}
          type="button"
          onClick={() => askQuestion(q.id)}
          className={`min-h-11 rounded-[14px] border px-[18px] py-3.5 text-base font-semibold ${
            selectedId === q.id
              ? 'border-brand bg-brand-soft text-brand-text'
              : 'border-line bg-surface text-ink hover:bg-canvas'
          }`}
        >
          {q.question}
        </button>
      ))}
    </div>
  )
}
