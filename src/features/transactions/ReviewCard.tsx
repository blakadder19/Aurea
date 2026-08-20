import { Card } from '../../components/Card'
import type { ReviewItem } from '../../data/transactions'
import { useTransactionsStore } from './store'

const VARIANT_CHIP = {
  success: 'bg-green-soft border-green-soft-line text-green-text',
  warning: 'bg-warning-bg border-warning-line text-warning-text',
  danger: 'bg-danger-bg border-danger-line text-danger-text',
} as const

const ACTION_STYLE = {
  primary: 'border-green bg-green text-surface hover:bg-green-hover',
  default: 'border-line bg-surface text-ink',
  muted: 'border-line bg-surface text-ink-muted',
} as const

/** Una tarjeta de revisión: confianza + explicación + botonera de acciones explícitas. */
export function ReviewCard({ item }: { item: ReviewItem }) {
  const resolveReview = useTransactionsStore((s) => s.resolveReview)

  return (
    <Card className="flex flex-col gap-3.5" padding="lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[17px] font-bold text-ink">{item.title}</div>
          <div className="mt-1 text-[15px] text-ink-muted">{item.meta}</div>
        </div>
        <span
          className={`rounded-full border px-2.5 py-[5px] text-sm font-bold whitespace-nowrap ${VARIANT_CHIP[item.variant]}`}
        >
          {item.confidenceLabel}
        </span>
      </div>

      <div className="rounded-md bg-canvas p-3.5 text-base text-ink text-pretty">{item.explanation}</div>

      <div className="flex flex-wrap gap-2.5">
        {item.actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => resolveReview(item.id, action.message)}
            className={`min-h-11 rounded-md border px-4 py-2.5 text-base font-semibold ${ACTION_STYLE[action.style]}`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </Card>
  )
}
