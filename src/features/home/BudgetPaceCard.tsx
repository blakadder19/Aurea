import { Link } from 'react-router-dom'
import { Badge, type BadgeVariant } from '../../components/Badge'
import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { ProgressBar } from '../../components/ProgressBar'
import { RingChart } from '../../components/RingChart'
import { budget } from '../../data/demo'
import { useBudgetStore } from '../budget/store'
import type { RealVerdict } from '../budget/MonthVerdictCard'

const VARIANT_STROKE: Partial<Record<BadgeVariant, string>> = {
  success: 'stroke-green',
  warning: 'stroke-warning',
  danger: 'stroke-danger',
}

/** Bloque 3 — Presupuesto. Titular-conclusión + anillo de ritmo real vs esperado. En real, sin "Comprometido": no hay dato de gasto comprometido. */
export function BudgetPaceCard({ real }: { real?: RealVerdict } = {}) {
  if (real) {
    const spentPct = real.paceRealPct ?? 0
    return (
      <Card className="flex flex-col gap-3.5" padding="md">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-serif text-[22px] leading-[1.2] font-extrabold text-ink">{real.headline}</h2>
          <Badge variant={real.badgeVariant}>{real.badgeLabel}</Badge>
        </div>

        {real.paceRealPct !== null && (
          <>
            <div className="flex items-center gap-4">
              <RingChart
                segments={[{ value: real.gastado, strokeClassName: VARIANT_STROKE[real.badgeVariant] ?? 'stroke-ink-faint' }]}
                max={Math.max(real.presupuestado, real.gastado, 1)}
                size={64}
                strokeWidth={8}
                ariaLabel={`${Math.round(real.paceRealPct)}% del presupuesto consumido`}
              />
              <div className="text-base text-ink tabular">
                <Money value={real.gastado} decimals={0} /> gastados de <Money value={real.presupuestado} decimals={0} /> presupuestados ·{' '}
                {Math.round(real.paceRealPct)} %
              </div>
            </div>
            <ProgressBar
              percent={spentPct}
              markerPercent={real.paceExpectedPct ?? undefined}
              label={`${Math.round(real.paceRealPct)}% del presupuesto consumido`}
            />
          </>
        )}

        {real.paceRealPct === null ? (
          // Sin presupuesto, "Restante" sería restante de 0 — un número que
          // no significa nada. Mejor lo gastado y una salida para arreglarlo.
          <div className="flex flex-wrap items-end justify-between gap-3 border-t border-line pt-3 tabular">
            <div>
              <div className="text-sm text-ink-muted">Llevas gastado</div>
              <div className="text-[22px] font-bold text-ink">
                <Money value={real.gastado} decimals={0} />
              </div>
            </div>
            <Link
              to="/presupuesto"
              onClick={() => useBudgetStore.getState().openPanel()}
              className="inline-flex min-h-11 items-center rounded-md border border-brand bg-brand px-4 text-base font-semibold text-surface hover:bg-brand-hover"
            >
              Poner presupuesto
            </Link>
          </div>
        ) : (
          <div className="flex items-baseline justify-between border-t border-line pt-3 tabular">
            <div>
              <div className="text-sm text-ink-muted">Previsión de cierre</div>
              <div className="text-[22px] font-bold">
                <Money value={real.previsionCierre} decimals={0} />
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-ink-muted">Restante</div>
              <div className="text-[22px] font-bold text-ink">
                <Money value={real.restante} decimals={0} />
              </div>
            </div>
          </div>
        )}
      </Card>
    )
  }

  const spentPct = (budget.spent / budget.budgeted) * 100

  return (
    <Card className="flex flex-col gap-3.5" padding="md">
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-serif text-[22px] leading-[1.2] font-extrabold text-ink">{budget.headline}</h2>
        <Badge variant="warning">Por encima</Badge>
      </div>

      <div className="flex items-center gap-4">
        <RingChart
          segments={[{ value: budget.spent, strokeClassName: 'stroke-warning' }]}
          max={Math.max(budget.budgeted, budget.spent, 1)}
          size={64}
          strokeWidth={8}
          ariaLabel={`${budget.paceReal}% del presupuesto consumido`}
        />
        <div className="text-base text-ink tabular">
          <Money value={budget.spent} decimals={0} /> gastados de <Money value={budget.budgeted} decimals={0} /> presupuestados · {budget.paceReal} %
        </div>
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
