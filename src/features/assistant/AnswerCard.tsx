import { Link } from 'react-router-dom'
import { Badge } from '../../components/Badge'
import { Card } from '../../components/Card'
import type { Answer } from './answers'

/** Tarjeta de respuesta: pregunta citada, badge de tipo, cifra en serif, cálculo a la vista, enlace y acción siguiente. */
export function AnswerCard({ answer }: { answer: Answer }) {
  return (
    <Card padding="lg" className="flex flex-col gap-4">
      <div className="text-base text-ink-muted italic">Preguntaste: «{answer.question}»</div>

      <Badge variant={answer.badge.variant} icon="">
        {answer.badge.label}
      </Badge>

      <div className="font-serif text-[32px] font-semibold text-ink text-pretty">{answer.headline}</div>

      <p className="text-base text-ink text-pretty">{answer.body}</p>

      <div className="rounded-xl bg-canvas p-4 text-[15px] text-ink tabular">{answer.calculation}</div>

      {answer.recommendation && (
        <div className="flex flex-col gap-2">
          <Badge variant={answer.recommendation.badge.variant} icon="">
            {answer.recommendation.badge.label}
          </Badge>
          <p className="text-base text-ink text-pretty">{answer.recommendation.text}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-4">
        <Link to={answer.linkTo} className="border-b border-brand text-base font-semibold text-brand">
          {answer.linkLabel}
        </Link>
        <Link
          to={answer.nextActionTo}
          className="flex min-h-11 items-center rounded-md border border-line bg-surface px-3.5 text-base font-semibold text-ink hover:bg-canvas"
        >
          {answer.nextActionLabel}
        </Link>
      </div>
    </Card>
  )
}
