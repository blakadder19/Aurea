import { Badge, type BadgeVariant } from '../../components/Badge'
import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { ProgressBar } from '../../components/ProgressBar'
import { RingChart } from '../../components/RingChart'
import { budgetCategories, budgetSummary } from '../../data/budget'
import { useBudgetStore } from './store'

const VARIANT_STROKE: Partial<Record<BadgeVariant, string>> = {
  success: 'stroke-green',
  warning: 'stroke-warning',
  danger: 'stroke-danger',
}

interface Kpi {
  label: string
  value: number
  warn?: boolean
}

export interface RealVerdict {
  headline: string
  badgeLabel: string
  badgeVariant: BadgeVariant
  /** 0-100, o null si aún no hay presupuesto puesto (sin ritmo que mostrar). */
  paceRealPct: number | null
  paceExpectedPct: number | null
  presupuestado: number
  gastado: number
  restante: number
  previsionCierre: number
}

/** Bloque 1 — Conclusión del mes: titular + barra de ritmo + cinco KPIs. */
export function MonthVerdictCard({ real }: { real?: RealVerdict }) {
  const categoryBudgets = useBudgetStore((s) => s.categoryBudgets)

  const totalBudgeted = real
    ? real.presupuestado
    : budgetCategories.reduce((sum, c) => sum + (categoryBudgets[c.id] ?? c.budgeted), 0)
  const remaining = real ? real.restante : totalBudgeted - budgetSummary.spent - budgetSummary.committed
  const spentPct = real ? (real.paceRealPct ?? 0) : (budgetSummary.spent / totalBudgeted) * 100
  const expectedPct = real ? real.paceExpectedPct : budgetSummary.paceExpected

  const kpis: Kpi[] = real
    ? [
        { label: 'Presupuestado', value: real.presupuestado },
        { label: 'Gastado', value: real.gastado },
        { label: 'Restante', value: real.restante },
        { label: 'Previsión de cierre', value: real.previsionCierre, warn: true },
      ]
    : [
        { label: 'Presupuestado', value: totalBudgeted },
        { label: 'Gastado', value: budgetSummary.spent },
        { label: 'Comprometido', value: budgetSummary.committed },
        { label: 'Restante', value: remaining },
        { label: 'Previsión de cierre', value: budgetSummary.forecast, warn: true },
      ]

  const badgeVariant = real ? real.badgeVariant : 'warning'

  return (
    <Card className="flex flex-col gap-[18px]" padding="lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <RingChart
            segments={[{ value: totalBudgeted > 0 ? spentPct : 0, strokeClassName: VARIANT_STROKE[badgeVariant] ?? 'stroke-ink-faint' }]}
            max={100}
            size={72}
            strokeWidth={9}
            ariaLabel={`${Math.round(spentPct)}% del presupuesto consumido`}
          />
          <h2 className="font-serif text-[26px] font-semibold text-ink">{real ? real.headline : budgetSummary.headline}</h2>
        </div>
        <Badge variant={badgeVariant}>{real ? real.badgeLabel : 'Por encima'}</Badge>
      </div>

      <ProgressBar
        percent={spentPct}
        markerPercent={expectedPct ?? undefined}
        heightPx={18}
        label={
          expectedPct !== null
            ? `${Math.round(spentPct)}% del presupuesto consumido, ritmo esperado ${Math.round(expectedPct)}%`
            : `${Math.round(spentPct)}% del presupuesto consumido`
        }
      />
      <div className="flex justify-between text-sm text-ink-muted tabular">
        <span>Ritmo real {Math.round(spentPct)} %</span>
        <span>{expectedPct !== null ? `Ritmo esperado ${Math.round(expectedPct)} %` : 'Sin presupuesto para calcular el ritmo'}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 border-t border-line pt-[18px] tabular sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <div key={kpi.label}>
            <div className="text-sm text-ink-muted">{kpi.label}</div>
            <Money value={kpi.value} decimals={0} tone={kpi.warn ? 'warning' : 'ink'} className="text-2xl font-bold" />
          </div>
        ))}
      </div>
    </Card>
  )
}
