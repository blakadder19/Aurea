import { RecurringCalendar } from './RecurringCalendar'
import { RecurringList } from './RecurringList'
import { SubscriptionDetailPanel } from './SubscriptionDetailPanel'
import { useRecurringStore, type RecurringView } from './store'
import { UndoBar } from '../../components/UndoBar'
import { recurringItems } from '../../data/recurring'
import { formatMoney } from '../../lib/format'

const VIEWS: { value: RecurringView; label: string }[] = [
  { value: 'lista', label: 'Lista cronológica' },
  { value: 'calendario', label: 'Calendario' },
]

function Header() {
  const view = useRecurringStore((s) => s.view)
  const setView = useRecurringStore((s) => s.setView)

  const monthlyTotal = recurringItems.reduce((sum, i) => sum + i.amount, 0)
  const annualTotal = monthlyTotal * 12

  return (
    <header className="flex flex-col gap-4 border-b border-line bg-surface px-4 py-5 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-[32px] font-semibold tracking-[-0.01em] text-ink">Pagos y suscripciones</h1>
          <div className="mt-1 text-base text-ink-muted">
            {formatMoney(monthlyTotal, 2)} recurrentes al mes · {formatMoney(annualTotal, 2)} al año
          </div>
        </div>
        <button
          type="button"
          className="min-h-11 rounded-md border border-green bg-green px-[18px] py-2.5 text-base font-semibold text-surface hover:bg-green-hover"
        >
          Añadir recurrente
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-[13px] font-semibold tracking-[0.08em] text-ink-muted uppercase">Vista</span>
        <div className="flex flex-wrap gap-1 rounded-md border border-line bg-canvas p-1">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              type="button"
              onClick={() => setView(v.value)}
              aria-pressed={view === v.value}
              className={`min-h-11 rounded-sm px-[18px] py-2 text-[15px] ${
                view === v.value
                  ? 'border border-line bg-surface font-semibold text-ink'
                  : 'border border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}

/** Pantalla Pagos y suscripciones: lista agrupada o calendario mensual. */
export function RecurringPage() {
  const view = useRecurringStore((s) => s.view)
  const undoMessage = useRecurringStore((s) => s.undoMessage)
  const dismissUndo = useRecurringStore((s) => s.dismissUndo)

  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 lg:p-8">
        {view === 'lista' ? <RecurringList /> : <RecurringCalendar />}
        {undoMessage && <UndoBar message={undoMessage} onUndo={dismissUndo} />}
      </main>
      <SubscriptionDetailPanel />
    </>
  )
}
