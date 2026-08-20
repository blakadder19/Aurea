import { useState } from 'react'
import { AttentionTray } from './AttentionTray'
import { AvailableTodayCard } from './AvailableTodayCard'
import { BudgetBreakdownTable } from './BudgetBreakdownTable'
import { BudgetPaceCard } from './BudgetPaceCard'
import { ExplainableInsight } from './ExplainableInsight'
import { NetWorthCard } from './NetWorthCard'
import { RecentTransactions } from './RecentTransactions'
import { UpcomingTimeline } from './UpcomingTimeline'
import { UndoBar } from '../../components/UndoBar'
import { CONTEXT_DATE, alertsCount, syncedAt, undoBanner } from '../../data/demo'
import { formatMonthYearLong, formatWeekdayDate } from '../../lib/format'
import { useHomeUIStore, type ViewMode } from '../../store/useHomeUIStore'

const PERIODS = ['Mes actual', '3 meses', 'Año', 'Personalizado']
const VIEW_MODES: { value: ViewMode; label: string }[] = [
  { value: 'resumen', label: 'Resumen' },
  { value: 'detalle', label: 'Detalle' },
]

function Header() {
  const mode = useHomeUIStore((s) => s.mode)
  const setMode = useHomeUIStore((s) => s.setMode)
  const [period, setPeriod] = useState(PERIODS[0])

  const dateLabel = `${formatWeekdayDate(CONTEXT_DATE)} · ${formatMonthYearLong(
    CONTEXT_DATE.getMonth(),
    CONTEXT_DATE.getFullYear(),
  )}`

  return (
    <header className="flex flex-col gap-4 border-b border-line bg-surface px-4 py-5 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-[32px] font-semibold tracking-[-0.01em] text-ink">Inicio</h1>
          <div className="mt-1 text-base text-ink-muted">{dateLabel}</div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-h-11 items-center gap-2 rounded-md border border-green-soft-line bg-green-soft px-3 py-2 text-sm font-semibold text-green-text">
            <span aria-hidden="true">✓</span> Sincronizado · {syncedAt}
          </div>
          <button
            type="button"
            className="flex min-h-11 items-center gap-2 rounded-md border border-line bg-surface px-3.5 py-2.5 text-base font-semibold text-ink hover:border-ink"
          >
            Avisos
            <span className="rounded-full bg-danger px-2 py-0.5 text-[13px] font-bold text-surface">
              {alertsCount}
            </span>
          </button>
          <button
            type="button"
            className="min-h-11 rounded-md border border-green bg-green px-[18px] py-2.5 text-base font-semibold text-surface hover:bg-green-hover"
          >
            Añadir movimiento
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[13px] font-semibold tracking-[0.08em] text-ink-muted uppercase">Periodo</span>
          <div className="flex flex-wrap gap-1 rounded-md border border-line bg-canvas p-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                aria-pressed={period === p}
                className={`min-h-11 rounded-sm px-3.5 py-2 text-[15px] font-semibold ${
                  period === p ? 'border border-line bg-surface text-ink' : 'border border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-[13px] font-semibold tracking-[0.08em] text-ink-muted uppercase">Vista</span>
          <div className="flex gap-1 rounded-md border border-line bg-canvas p-1">
            {VIEW_MODES.map((v) => (
              <button
                key={v.value}
                type="button"
                onClick={() => setMode(v.value)}
                aria-pressed={mode === v.value}
                className={`min-h-11 rounded-sm px-[18px] py-2 text-[15px] ${
                  mode === v.value
                    ? 'border border-green bg-surface font-bold text-green-text'
                    : 'border border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}

/** Pantalla Inicio completa, modos Resumen y Detalle. */
export function HomePage() {
  const isDetalle = useHomeUIStore((s) => s.mode === 'detalle')

  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 lg:p-8">
        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[1.25fr_1fr]">
          <div className="min-w-0">
            <AvailableTodayCard />
          </div>
          <div className="flex min-w-0 flex-col gap-6">
            <NetWorthCard />
            <BudgetPaceCard />
          </div>
        </div>

        <UpcomingTimeline />

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          <div className="min-w-0">
            <AttentionTray />
          </div>
          <div className="flex min-w-0 flex-col gap-6">
            <ExplainableInsight />
            <RecentTransactions />
          </div>
        </div>

        {isDetalle && <BudgetBreakdownTable />}

        <UndoBar message={undoBanner.message} />
      </main>
    </>
  )
}
