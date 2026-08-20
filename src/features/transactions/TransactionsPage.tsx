import { BulkActionsBar } from './BulkActionsBar'
import { FilterBar } from './FilterBar'
import { ReviewCenter } from './ReviewCenter'
import { TransactionPanel } from './TransactionPanel'
import { TransactionsTable } from './TransactionsTable'
import { useTransactionsStore, type TransactionsView } from './store'
import { UndoBar } from '../../components/UndoBar'
import { defaultUndoMessage, monthContextLabel, totalMovementsThisMonth } from '../../data/transactions'
import { syncedAt } from '../../data/demo'

const VIEWS: { value: TransactionsView; label: (reviewCount: number) => string }[] = [
  { value: 'tabla', label: () => 'Todos los movimientos' },
  { value: 'revision', label: (n) => `Centro de revisión (${n})` },
]

function Header() {
  const view = useTransactionsStore((s) => s.view)
  const setView = useTransactionsStore((s) => s.setView)
  const reviewCount = useTransactionsStore((s) => s.reviewItems.length)

  return (
    <header className="flex flex-col gap-4 border-b border-line bg-surface px-4 py-5 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-[32px] font-semibold tracking-[-0.01em] text-ink">Movimientos</h1>
          <div className="mt-1 text-base text-ink-muted">
            {totalMovementsThisMonth} movimientos en {monthContextLabel}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-h-11 items-center gap-2 rounded-md border border-green-soft-line bg-green-soft px-3 py-2 text-sm font-semibold text-green-text">
            <span aria-hidden="true">✓</span> Sincronizado · {syncedAt}
          </div>
          <button
            type="button"
            className="min-h-11 rounded-md border border-green bg-green px-[18px] py-2.5 text-base font-semibold text-surface hover:bg-green-hover"
          >
            Añadir movimiento
          </button>
        </div>
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
              {v.label(reviewCount)}
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}

/** Pantalla Movimientos: tabla con selección y Centro de revisión, encima del shell del corte 1. */
export function TransactionsPage() {
  const view = useTransactionsStore((s) => s.view)
  const undoMessage = useTransactionsStore((s) => s.undoMessage)
  const dismissUndo = useTransactionsStore((s) => s.dismissUndo)

  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col gap-5 overflow-y-auto p-4 lg:p-8">
        {view === 'tabla' ? (
          <>
            <FilterBar />
            <BulkActionsBar />
            <TransactionsTable />
            <UndoBar message={undoMessage ?? defaultUndoMessage} onUndo={dismissUndo} />
          </>
        ) : (
          <>
            <ReviewCenter />
            {undoMessage && <UndoBar message={undoMessage} onUndo={dismissUndo} />}
          </>
        )}
      </main>
      <TransactionPanel />
    </>
  )
}
