import { Badge } from '../../components/Badge'
import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { ProgressBar } from '../../components/ProgressBar'
import { budget } from '../../data/demo'

/** Bloque 3 — Presupuesto. Titular-conclusión + barra de ritmo real vs esperado. */
export function BudgetPaceCard() {
  const spentPct = (budget.spent / budget.budgeted) * 100

  return (
    <Card className="flex flex-col gap-3.5" padding="md">
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-serif text-[26px] leading-[1.2] font-semibold text-ink">{budget.headline}</h2>
        <Badge variant="warning">Por encima</Badge>
      </div>

      <div className="text-base text-ink tabular">
        <Money value={budget.spent} decimals={0} /> gastados de <Money value={budget.budgeted} decimals={0} /> presupuestados · {budget.paceReal} %
      </div>

      <ProgressBar
        percent={spentPct}
        markerPercent={budget.paceExpected}
        label={`${budget.paceReal}% del presupuesto consumido, ritmo esperado ${budget.paceExpected}%`}
      />

      <div className="flex justify-between text-sm text-ink-muted tabular">
        <span>Ritmo real {budget.paceReal} %</span>
        <span>
          Ritmo esperado {budget.paceExpected} % (día {budget.dayOfMonth} de {budget.daysInMonth})
        </span>
      </div>

      <div className="flex items-baseline justify-between border-t border-line pt-3 tabular">
        <div>
          <div className="text-sm text-ink-muted">Previsión de cierre</div>
          <div className="text-[22px] font-bold">
            <Money value={budget.forecast} decimals={0} />
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-ink-muted">Restante</div>
          <div className="text-[22px] font-bold text-ink">
            <Money value={budget.remaining} decimals={0} />
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-ink-muted">Comprometido</div>
          <div className="text-[22px] font-bold text-ink">
            <Money value={budget.committed} decimals={0} />
          </div>
        </div>
      </div>
    </Card>
  )
}
