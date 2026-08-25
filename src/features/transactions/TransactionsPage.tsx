import { useEffect } from 'react'
import { BulkActionsBar } from './BulkActionsBar'
import { FilterBar } from './FilterBar'
import { RealReviewCenter } from './RealReviewCenter'
import { ReviewCenter } from './ReviewCenter'
import { TransactionPanel } from './TransactionPanel'
import { TransactionsTable } from './TransactionsTable'
import { useTransactionsStore, type TransactionsView } from './store'
import {
  bulkUpdateTransactionCategory,
  createRuleFromTransaction,
  updateTransactionCategory,
  updateTransactionNotesAndTags,
  useRealTransactions,
} from './useRealTransactions'
import { useRealCategories } from './useRealCategories'
import { ErrorState } from '../../components/states/ErrorState'
import { EmptyState } from '../../components/states/EmptyState'
import { LoadingRealData } from '../../components/states/LoadingRealData'
import { UndoBar } from '../../components/UndoBar'
import { defaultUndoMessage, monthContextLabel, totalMovementsThisMonth, transactions as demoTransactions } from '../../data/transactions'
import { syncedAt } from '../../data/demo'
import { useAuthStore } from '../../lib/supabase/useAuth'

const VIEWS: { value: TransactionsView; label: (reviewCount: number) => string }[] = [
  { value: 'tabla', label: () => 'Todos los movimientos' },
  { value: 'revision', label: (n) => `Centro de revisión (${n})` },
]

function Header({ isAuthenticated, realCount, realReviewCount }: { isAuthenticated: boolean; realCount: number; realReviewCount: number }) {
  const view = useTransactionsStore((s) => s.view)
  const setView = useTransactionsStore((s) => s.setView)
  const demoReviewCount = useTransactionsStore((s) => s.reviewItems.length)
  const reviewCount = isAuthenticated ? realReviewCount : demoReviewCount

  return (
    <header className="flex flex-col gap-4 border-b border-line bg-surface px-4 py-5 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-[32px] font-semibold tracking-[-0.01em] text-ink">Movimientos</h1>
          <div className="mt-1 text-base text-ink-muted">
            {isAuthenticated ? `${realCount} movimientos sincronizados` : `${totalMovementsThisMonth} movimientos en ${monthContextLabel}`}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-h-11 items-center gap-2 rounded-md border border-green-soft-line bg-green-soft px-3 py-2 text-sm font-semibold text-green-text">
            <span aria-hidden="true">✓</span> Sincronizado · {syncedAt}
          </div>
          <button
            type="button"
            className="min-h-11 rounded-md border border-brand bg-brand px-[18px] py-2.5 text-base font-semibold text-surface hover:bg-brand-hover"
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
  const clearSelection = useTransactionsStore((s) => s.clearSelection)
  const session = useAuthStore((s) => s.session)

  const { categories: realCategories } = useRealCategories()
  const { loading: loadingReal, transactions: realTransactions, refetch } = useRealTransactions(realCategories)

  const isAuthenticated = session !== null
  const hasRealTransactions = isAuthenticated && !loadingReal && realTransactions !== null && realTransactions.length > 0
  const realReviewCount = realTransactions?.filter((t) => !t.categoryId || t.needsReview).length ?? 0

  // La selección por defecto de la demo (AMZN/Zara) no tiene sentido en real:
  // esos ids nunca corresponden a un movimiento real, pero seguirían contando
  // como "seleccionados" en la barra de acciones en lote.
  useEffect(() => {
    if (isAuthenticated) clearSelection()
  }, [isAuthenticated, clearSelection])

  async function handleSaveCategory(id: string, categoryId: string) {
    const error = await updateTransactionCategory(id, categoryId || null)
    if (!error) refetch()
    return error
  }

  async function handleSaveNotesAndTags(id: string, note: string, tags: string[]) {
    const error = await updateTransactionNotesAndTags(id, note, tags)
    if (!error) refetch()
    return error
  }

  async function handleCreateRule(matchValue: string, categoryId: string) {
    const result = await createRuleFromTransaction(matchValue, categoryId)
    if (!result.error) refetch()
    return result
  }

  async function handleBulkCategorize(ids: string[], categoryId: string) {
    const error = await bulkUpdateTransactionCategory(ids, categoryId)
    if (!error) refetch()
    return error
  }

  const realProps = hasRealTransactions
    ? {
        categories: realCategories ?? [],
        onSaveCategory: handleSaveCategory,
        onSaveNotesAndTags: handleSaveNotesAndTags,
        onCreateRule: handleCreateRule,
      }
    : undefined

  return (
    <>
      <Header isAuthenticated={isAuthenticated} realCount={realTransactions?.length ?? 0} realReviewCount={realReviewCount} />
      <main className="flex flex-1 flex-col gap-5 overflow-y-auto p-4 lg:p-8">
        {isAuthenticated && loadingReal ? (
          <LoadingRealData />
        ) : isAuthenticated && !loadingReal && realTransactions?.length === 0 ? (
          <EmptyState
            headline="Todavía no hay movimientos sincronizados"
            body="En cuanto conectes un banco en Cuentas y patrimonio, sus movimientos aparecerán aquí."
            action={{ label: 'Ir a Cuentas y patrimonio', to: '/cuentas' }}
          />
        ) : view === 'tabla' ? (
          !isAuthenticated && demoTransactions.length === 0 ? (
            // No hay backend real que reintentar: este estado documenta el punto de
            // integración para cuando exista (ver docs/DUDAS.md, corte 13).
            <ErrorState
              headline="No hemos podido cargar tus movimientos"
              body="Puede ser un problema temporal de conexión con tu banco."
              onRetry={() => {}}
            />
          ) : (
            <>
              <FilterBar
                accounts={hasRealTransactions ? [...new Set(realTransactions!.map((t) => t.cuenta))] : undefined}
                categories={hasRealTransactions ? realCategories!.map((c) => c.name) : undefined}
              />
              <BulkActionsBar categories={hasRealTransactions ? realCategories! : undefined} onBulkCategorize={hasRealTransactions ? handleBulkCategorize : undefined} />
              <TransactionsTable transactions={hasRealTransactions ? realTransactions! : undefined} />
              {!isAuthenticated && <UndoBar message={undoMessage ?? defaultUndoMessage} onUndo={dismissUndo} />}
            </>
          )
        ) : hasRealTransactions ? (
          <RealReviewCenter transactions={realTransactions!} />
        ) : (
          <>
            <ReviewCenter />
            {undoMessage && <UndoBar message={undoMessage} onUndo={dismissUndo} />}
          </>
        )}
      </main>
      <TransactionPanel transactions={hasRealTransactions ? realTransactions! : undefined} real={realProps} />
    </>
  )
}
