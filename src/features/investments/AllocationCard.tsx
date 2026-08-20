import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { ProgressBar } from '../../components/ProgressBar'
import { allocation, rebalanceRecommendation } from '../../data/investments'

const FILL_BY_COLOR = { plum: 'bg-plum', info: 'bg-info', warning: 'bg-warning' } as const

/** Bloque 4 — Asignación actual frente a objetivo, con propuesta de rebalanceo. */
export function AllocationCard() {
  return (
    <Card padding="lg" className="flex flex-col gap-[18px]">
      <h2 className="font-serif text-2xl font-semibold text-ink">Asignación actual frente a objetivo</h2>

      <div className="flex flex-col gap-3.5">
        {allocation.map((a) => (
          <div key={a.id}>
            <div className="mb-1.5 flex flex-wrap justify-between gap-2 text-base">
              <span className="font-semibold text-ink">{a.name}</span>
              <span className="text-ink-muted tabular">
                {a.currentPct} % actual · {a.targetPct} % objetivo
              </span>
            </div>
            <ProgressBar
              percent={a.currentPct}
              markerPercent={a.targetPct}
              fillClassName={FILL_BY_COLOR[a.color]}
              heightPx={12}
              label={`${a.name}: ${a.currentPct}% actual, objetivo ${a.targetPct}%`}
            />
          </div>
        ))}
      </div>

      <div className="rounded-[14px] bg-canvas p-4 text-base text-ink text-pretty">
        <span className="label-section mr-1">Recomendación:</span>
        mover <Money value={rebalanceRecommendation.amount} className="font-bold" /> de{' '}
        {rebalanceRecommendation.from} a {rebalanceRecommendation.to} para acercarte a tu objetivo{' '}
        {rebalanceRecommendation.targetSummary}.
      </div>
    </Card>
  )
}
