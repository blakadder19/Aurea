import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { useTransactionsStore } from './store'
import type { RealTransaction } from './useRealTransactions'

/**
 * Centro de revisión real: a diferencia de la demo, no inventamos
 * confianza ni explicaciones de un modelo — solo "sin clasificar" y un
 * botón que abre el panel para categorizarlo.
 */
export function RealReviewCenter({ transactions }: { transactions: RealTransaction[] }) {
  const openPanel = useTransactionsStore((s) => s.openPanel)
  const pending = transactions.filter((t) => !t.categoryId || t.needsReview)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-base text-ink-muted">
        {pending.length === 0
          ? 'No queda nada por revisar.'
          : `${pending.length} movimiento${pending.length === 1 ? '' : 's'} sin categorizar.`}
      </p>

      {pending.length === 0 ? (
        <Card padding="lg" className="py-12 text-center">
          <p className="text-base text-ink-muted">No queda nada por revisar.</p>
        </Card>
      ) : (
        pending.map((t) => (
          <Card key={t.id} className="flex flex-col gap-3.5" padding="lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[17px] font-bold text-ink">{t.comercio}</div>
                <div className="mt-1 text-[15px] text-ink-muted">
                  {t.fecha} · {t.cuenta}
                </div>
              </div>
              <Money value={t.importe} signed={t.importe > 0} tone={t.importe > 0 ? 'green' : 'ink'} className="text-[17px] font-bold" />
            </div>
            <button
              type="button"
              onClick={() => openPanel(t.id)}
              className="min-h-11 w-fit rounded-md border border-green bg-green px-4 py-2.5 text-base font-semibold text-surface hover:bg-green-hover"
            >
              Categorizar
            </button>
          </Card>
        ))
      )}
    </div>
  )
}
