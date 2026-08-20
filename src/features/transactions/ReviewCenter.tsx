import { Card } from '../../components/Card'
import { ReviewCard } from './ReviewCard'
import { useTransactionsStore } from './store'

/** Vista 2 — Centro de revisión. Lista de tarjetas o estado vacío. */
export function ReviewCenter() {
  const reviewItems = useTransactionsStore((s) => s.reviewItems)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-base text-ink-muted">
        Cuatro movimientos no se clasificaron con suficiente confianza. Revísalos uno a uno.
      </p>

      {reviewItems.length === 0 ? (
        <Card padding="lg" className="py-12 text-center">
          <p className="text-base text-ink-muted">No queda nada por revisar.</p>
        </Card>
      ) : (
        reviewItems.map((item) => <ReviewCard key={item.id} item={item} />)
      )}
    </div>
  )
}
