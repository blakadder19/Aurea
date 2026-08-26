import { Badge } from '../../components/Badge'
import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { ProgressBar } from '../../components/ProgressBar'
import { RingChart } from '../../components/RingChart'
import { CONTEXT_DATE } from '../../data/demo'
import type { Goal } from '../../data/goals'
import { formatMonthYear, goalForecast } from './domain'
import { useGoalsStore } from './store'

const FILL_BY_STATUS = { success: 'bg-green', danger: 'bg-danger' } as const
const RING_BY_STATUS = { success: 'stroke-green', danger: 'stroke-danger' } as const

const FILL_BY_COLOR: Record<string, string> = {
  brand: 'bg-brand',
  green: 'bg-green',
  blue: 'bg-goal-blue',
  orange: 'bg-goal-orange',
  pink: 'bg-goal-pink',
  purple: 'bg-goal-purple',
}
const RING_BY_COLOR: Record<string, string> = {
  brand: 'stroke-brand',
  green: 'stroke-green',
  blue: 'stroke-goal-blue',
  orange: 'stroke-goal-orange',
  pink: 'stroke-goal-pink',
  purple: 'stroke-goal-purple',
}

const MILESTONES = [25, 50, 75, 100]

/** Hitos ya alcanzados (25/50/75/100%), toque de "juego" sin datos nuevos: se calcula del progreso ya conocido. */
function reachedMilestones(progressPct: number): number[] {
  return MILESTONES.filter((m) => progressPct >= m)
}

interface GoalCardProps {
  goal: Goal
  asOf?: Date
  onEdit?: () => void
  onArchive?: () => void
}

/** Una tarjeta de objetivo con badge de estado, progreso y fecha estimada. */
export function GoalCard({ goal, asOf = CONTEXT_DATE, onEdit, onArchive }: GoalCardProps) {
  const extra = useGoalsStore((s) => s.extraSaved[goal.id] ?? 0)
  const saved = goal.saved + extra

  const { progressPct, projectedDate } = goalForecast(saved, goal.target, goal.monthlyContribution, asOf)
  const ringClass = (goal.color && RING_BY_COLOR[goal.color]) || RING_BY_STATUS[goal.status]
  const fillClass = (goal.color && FILL_BY_COLOR[goal.color]) || FILL_BY_STATUS[goal.status]
  const milestones = reachedMilestones(progressPct)

  return (
    <Card className="flex flex-col gap-4" padding="lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <RingChart
            segments={[{ value: progressPct, strokeClassName: ringClass }]}
            max={100}
            size={56}
            strokeWidth={7}
            ariaLabel={`${Math.round(progressPct)}% del objetivo`}
          />
          <div>
            <h2 className="font-serif text-[22px] lg:text-[19px] font-semibold text-ink">
              {goal.icon && <span aria-hidden="true">{goal.icon} </span>}
              {goal.name}
            </h2>
            {(onEdit || onArchive) && (
              <div className="mt-0.5 flex gap-3 text-sm">
                {onEdit && (
                  <button type="button" onClick={onEdit} className="text-brand underline hover:no-underline">
                    Editar
                  </button>
                )}
                {onArchive && (
                  <button type="button" onClick={onArchive} className="text-ink-muted underline hover:no-underline">
                    Archivar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <Badge variant={goal.status}>{goal.statusLabel}</Badge>
      </div>

      <div className="font-serif text-[30px] font-semibold text-ink tabular">
        <Money value={saved} decimals={0} />{' '}
        <span className="text-[17px] font-normal text-ink-muted">
          de <Money value={goal.target} decimals={0} />
        </span>
      </div>

      <ProgressBar percent={progressPct} fillClassName={fillClass} heightPx={14} label={`${Math.round(progressPct)}% del objetivo`} />

      {milestones.length > 0 && (
        <div className="flex gap-1.5" aria-label={`Hitos alcanzados: ${milestones.join(', ')}%`}>
          {milestones.map((m) => (
            <span key={m} title={`${m}% alcanzado`} className="text-lg leading-none" aria-hidden="true">
              {m === 100 ? '🏆' : '⭐'}
            </span>
          ))}
        </div>
      )}

      <p className="text-[15px] text-ink-muted">
        Fecha estimada: {projectedDate ? formatMonthYear(projectedDate) : 'sin aportación, no hay fecha'}, {goal.note}.
      </p>
    </Card>
  )
}
