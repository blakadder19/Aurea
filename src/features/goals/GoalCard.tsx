import { Badge } from '../../components/Badge'
import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { ProgressBar } from '../../components/ProgressBar'
import { CONTEXT_DATE } from '../../data/demo'
import type { Goal } from '../../data/goals'
import { formatMonthYear, goalForecast } from './domain'
import { useGoalsStore } from './store'

const FILL_BY_STATUS = { success: 'bg-green', danger: 'bg-danger' } as const

/** Una tarjeta de objetivo con badge de estado, progreso y fecha estimada. */
export function GoalCard({ goal, asOf = CONTEXT_DATE }: { goal: Goal; asOf?: Date }) {
  const extra = useGoalsStore((s) => s.extraSaved[goal.id] ?? 0)
  const saved = goal.saved + extra

  const { progressPct, projectedDate } = goalForecast(saved, goal.target, goal.monthlyContribution, asOf)

  return (
    <Card className="flex flex-col gap-4" padding="lg">
      <div className="flex items-start justify-between gap-4">
        <h2 className="font-serif text-[22px] font-semibold text-ink">{goal.name}</h2>
        <Badge variant={goal.status}>{goal.statusLabel}</Badge>
      </div>

      <div className="font-serif text-[30px] font-semibold text-ink tabular">
        <Money value={saved} decimals={0} />{' '}
        <span className="text-[17px] font-normal text-ink-muted">
          de <Money value={goal.target} decimals={0} />
        </span>
      </div>

      <ProgressBar percent={progressPct} fillClassName={FILL_BY_STATUS[goal.status]} heightPx={14} label={`${Math.round(progressPct)}% del objetivo`} />

      <p className="text-[15px] text-ink-muted">
        Fecha estimada: {projectedDate ? formatMonthYear(projectedDate) : 'sin aportación, no hay fecha'}, {goal.note}.
      </p>
    </Card>
  )
}
