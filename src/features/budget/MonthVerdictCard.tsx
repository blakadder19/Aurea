import { Badge } from '../../components/Badge'
import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { ProgressBar } from '../../components/ProgressBar'
import { budgetCategories, budgetSummary } from '../../data/budget'
import { useBudgetStore } from './store'

interface Kpi {
  label: string
  value: number
  warn?: boolean
}

/** Bloque 1 — Conclusión del mes: titular + barra de ritmo + cinco KPIs. */
export function MonthVerdictCard() {
  const categoryBudgets = useBudgetStore((s) => s.categoryBudgets)
  const totalBudgeted = budgetCategories.reduce((sum, c) => sum + (categoryBudgets[c.id] ?? c.budgeted), 0)
  const remaining = totalBudgeted - budgetSummary.spent - budgetSummary.committed
  const spentPct = (budgetSummary.spent / totalBudgeted) * 100

  const kpis: Kpi[] = [
    { label: 'Presupuestado', value: totalBudgeted },
    { label: 'Gastado', value: budgetSummary.spent },
    { label: 'Comprometido', value: budgetSummary.committed },
    { label: 'Restante', value: remaining },
    { label: 'Previsión de cierre', value: budgetSummary.forecast, warn: true },
  ]

  return (
    <Card className="flex flex-col gap-[18px]" padding="lg">
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-serif text-[26px] font-semibold text-ink">{budgetSummary.headline}</h2>
        <Badge variant="warning">Por encima</Badge>
      </div>

      <ProgressBar
        percent={spentPct}
        markerPercent={budgetSummary.paceExpected}
        heightPx={18}
        label={`${budgetSummary.paceReal}% del presupuesto consumido, ritmo esperado ${budgetSummary.paceExpected}%`}
      />
      <div className="flex justify-between text-sm text-ink-muted tabular">
        <span>Ritmo real {budgetSummary.paceReal} %</span>
        <span>Ritmo esperado {budgetSummary.paceExpected} %</span>
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
