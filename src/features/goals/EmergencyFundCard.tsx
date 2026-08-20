import { Badge } from '../../components/Badge'
import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { ProgressBar } from '../../components/ProgressBar'
import { CONTEXT_DATE } from '../../data/demo'
import { emergencyFund } from '../../data/goals'
import { formatMonthYear, goalForecast } from './domain'
import { useGoalsStore } from './store'

/** Bloque 1 — Fondo de emergencia, medido en meses de gastos esenciales cubiertos. */
export function EmergencyFundCard() {
  const extra = useGoalsStore((s) => s.extraSaved.emergencia)
  const saved = emergencyFund.saved + extra

  const monthsCovered = saved / emergencyFund.monthlyEssentialSpend
  const monthsShort = Math.max(0, emergencyFund.targetMonths - monthsCovered)
  const { progressPct, projectedDate } = goalForecast(
    saved,
    emergencyFund.target,
    emergencyFund.monthlyContribution,
    CONTEXT_DATE,
  )
  const onTrack = progressPct >= emergencyFund.expectedProgressPct

  return (
    <Card className="flex flex-col gap-4" padding="lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-ink">
            {monthsShort > 0
              ? `Te faltan ${monthsShort.toLocaleString('es-ES', { maximumFractionDigits: 1 })} meses de colchón`
              : 'Tu fondo de emergencia cubre los 6 meses'}
          </h2>
          <div className="mt-1 text-base text-ink-muted">
            <Money value={saved} decimals={0} /> de <Money value={emergencyFund.target} decimals={0} /> necesarios
          </div>
        </div>
        <Badge variant={onTrack ? 'success' : 'warning'} icon={onTrack ? '✓' : undefined}>
          {onTrack ? 'Al ritmo' : 'Por detrás del ritmo'}
        </Badge>
      </div>

      <ProgressBar
        percent={progressPct}
        markerPercent={emergencyFund.expectedProgressPct}
        heightPx={18}
        label={`${Math.round(progressPct)}% cubierto, progreso previsto ${emergencyFund.expectedProgressPct}%`}
      />
      <div className="flex justify-between text-sm text-ink-muted tabular">
        <span>Progreso real {Math.round(progressPct)} %</span>
        <span>Progreso previsto {emergencyFund.expectedProgressPct} %</span>
      </div>

      <p className="text-base text-ink">
        <Money value={emergencyFund.monthlyEssentialSpend} decimals={0} /> de gastos esenciales al mes ×{' '}
        {emergencyFund.targetMonths} meses. Al ritmo actual, cubrirás los {emergencyFund.targetMonths} meses en{' '}
        {projectedDate ? formatMonthYear(projectedDate) : 'una fecha por determinar'}.
      </p>
    </Card>
  )
}
