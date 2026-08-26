import { Line, LineChart, ResponsiveContainer } from 'recharts'
import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { Skeleton } from '../../components/states/Skeleton'
import type { MonthlyTrendPoint } from './reportCalc'

const euros = (cents: number) => cents / 100

/**
 * Ingresos y gastos de los últimos meses de un vistazo — sparkline sin ejes
 * ni tooltip (mismo estilo minimalista que NetWorthTrendChart/ProjectionChart;
 * un tooltip al pasar el ratón no sirve de nada en móvil) más la cifra real
 * de cada mes debajo, siempre visible en vez de escondida tras un hover.
 */
export function MonthlyTrendChart({ points, loading }: { points: MonthlyTrendPoint[] | null; loading: boolean }) {
  if (loading || points === null) {
    return (
      <Card padding="lg" className="flex flex-col gap-3">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-[100px] w-full" label="Cargando la tendencia de los últimos meses…" />
      </Card>
    )
  }

  const hasAnyMovement = points.some((p) => p.incomeCents > 0 || p.expenseCents > 0)
  if (!hasAnyMovement) return null

  const data = points.map((p) => ({ incomeEuros: euros(p.incomeCents), expenseEuros: euros(p.expenseCents) }))

  return (
    <Card padding="lg" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-serif text-[22px] lg:text-[19px] font-semibold text-ink">Tendencia de varios meses</h2>
        <div className="flex items-center gap-4 text-sm font-semibold">
          <span className="flex items-center gap-1.5 text-green-text">
            <span className="h-2.5 w-2.5 rounded-full bg-green" aria-hidden="true" /> Ingresos
          </span>
          <span className="flex items-center gap-1.5 text-danger-text">
            <span className="h-2.5 w-2.5 rounded-full bg-danger" aria-hidden="true" /> Gastos
          </span>
        </div>
      </div>

      <div className="h-[100px] w-full" role="img" aria-label="Ingresos y gastos por mes de los últimos meses">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <Line type="monotone" dataKey="incomeEuros" stroke="#17a673" strokeWidth={2.5} dot={false} activeDot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="expenseEuros" stroke="#ef5a4c" strokeWidth={2.5} dot={false} activeDot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-x-2 gap-y-2 border-t border-line pt-3 sm:grid-cols-6">
        {points.map((p) => (
          <div key={p.monthLabel} className="flex flex-col gap-0.5">
            <div className="text-[13px] font-semibold text-ink-muted">{p.monthLabel}</div>
            <Money value={euros(p.incomeCents)} decimals={0} tone="green" className="text-[13px] font-semibold" />
            <Money value={-euros(p.expenseCents)} signed decimals={0} tone="danger" className="text-[13px] font-semibold" />
          </div>
        ))}
      </div>
    </Card>
  )
}
