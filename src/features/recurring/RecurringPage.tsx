import { useState } from 'react'
import { RecurringCalendar } from './RecurringCalendar'
import { RecurringList } from './RecurringList'
import { SubscriptionDetailPanel } from './SubscriptionDetailPanel'
import { useRecurringStore, type RecurringView } from './store'
import { dismissHighlight, dismissItem, undoDismiss, useRealRecurring } from './useRealRecurring'
import { EmptyState } from '../../components/states/EmptyState'
import { UndoBar } from '../../components/UndoBar'
import { recurringItems, type RecurringItem } from '../../data/recurring'
import { formatMoney } from '../../lib/format'
import { useAuthStore } from '../../lib/supabase/useAuth'

const VIEWS: { value: RecurringView; label: string }[] = [
  { value: 'lista', label: 'Lista cronológica' },
  { value: 'calendario', label: 'Calendario' },
]

function Header({ isAuthenticated, items }: { isAuthenticated: boolean; items: RecurringItem[] }) {
  const view = useRecurringStore((s) => s.view)
  const setView = useRecurringStore((s) => s.setView)

  const monthlyTotal = items.reduce((sum, i) => sum + i.amount, 0)
  const annualTotal = monthlyTotal * 12

  return (
    <header className="flex flex-col gap-4 border-b border-line bg-surface px-4 py-5 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-[32px] font-semibold tracking-[-0.01em] text-ink">Pagos y suscripciones</h1>
          <div className="mt-1 text-base text-ink-muted">
            {isAuthenticated
              ? items.length === 0
                ? 'Detectado a partir de tus movimientos sincronizados'
                : `${formatMoney(monthlyTotal, 2)} recurrentes al mes · ${formatMoney(annualTotal, 2)} al año · detectado a partir de tus movimientos`
              : `${formatMoney(monthlyTotal, 2)} recurrentes al mes · ${formatMoney(annualTotal, 2)} al año`}
          </div>
        </div>
        {!isAuthenticated && (
          <button
            type="button"
            className="min-h-11 rounded-md border border-brand bg-brand px-[18px] py-2.5 text-base font-semibold text-surface hover:bg-brand-hover"
          >
            Añadir recurrente
          </button>
        )}
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
  const dismissUndoDemo = useRecurringStore((s) => s.dismissUndo)
  const session = useAuthStore((s) => s.session)
  const isAuthenticated = session !== null

  const { loading: loadingReal, items: realItems, groups, refetch } = useRealRecurring()
  const [pendingUndo, setPendingUndo] = useState<{ dismissalId: string; message: string } | null>(null)

  const hasLoadedReal = isAuthenticated && !loadingReal && realItems !== null
  const items = hasLoadedReal ? realItems! : recurringItems

  async function handleResolveHighlight(item: RecurringItem) {
    const { dismissalId, error } = await dismissHighlight(item.id)
    if (error || !dismissalId) return
    setPendingUndo({ dismissalId, message: item.highlight?.resolvedMessage ?? 'Aviso descartado.' })
    refetch()
  }

  async function handleResolveItem(item: RecurringItem, message: string) {
    const { dismissalId, error } = await dismissItem(item.id)
    if (error || !dismissalId) return
    setPendingUndo({ dismissalId, message })
    refetch()
  }

  async function handleUndo() {
    if (!pendingUndo) return
    await undoDismiss(pendingUndo.dismissalId)
    setPendingUndo(null)
    refetch()
  }

  return (
    <>
      <Header isAuthenticated={isAuthenticated} items={items} />
      <main className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 lg:p-8">
        {isAuthenticated && hasLoadedReal && items.length === 0 ? (
          <EmptyState
            headline="Todavía no hemos detectado recurrentes"
            body="En cuanto tengas dos cargos mensuales seguidos del mismo comercio, aparecerán aquí automáticamente."
            action={{ label: 'Ver movimientos', to: '/movimientos' }}
          />
        ) : view === 'lista' ? (
          <RecurringList items={hasLoadedReal ? realItems! : undefined} onResolveHighlight={hasLoadedReal ? handleResolveHighlight : undefined} />
        ) : (
          <RecurringCalendar real={hasLoadedReal ? { groups, items: realItems! } : undefined} />
        )}
        {isAuthenticated
          ? pendingUndo && <UndoBar message={pendingUndo.message} onUndo={handleUndo} />
          : undoMessage && <UndoBar message={undoMessage} onUndo={dismissUndoDemo} />}
      </main>
      <SubscriptionDetailPanel
        items={hasLoadedReal ? realItems! : undefined}
        onResolve={hasLoadedReal ? handleResolveItem : undefined}
      />
    </>
  )
}
