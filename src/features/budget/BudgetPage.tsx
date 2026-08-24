import { AdjustBudgetPanel } from './AdjustBudgetPanel'
import { CategoryList } from './CategoryList'
import { MonthVerdictCard } from './MonthVerdictCard'
import { NonSpendCards } from './NonSpendCards'
import { useBudgetStore, type BudgetView } from './store'
import { saveCategoryBudget, toBudgetViewModel, useRealBudget } from './useRealBudget'
import { useRealCategories } from '../transactions/useRealCategories'
import { UndoBar } from '../../components/UndoBar'
import { budgetSummary } from '../../data/budget'
import { useAuthStore } from '../../lib/supabase/useAuth'

const VIEWS: { value: BudgetView; label: string }[] = [
  { value: 'resumen', label: 'Resumen' },
  { value: 'detalle', label: 'Detalle' },
]

function Header({ isAuthenticated, monthLabel, dayOfMonth, daysInMonthCount }: { isAuthenticated: boolean; monthLabel: string; dayOfMonth: number; daysInMonthCount: number }) {
  const mode = useBudgetStore((s) => s.mode)
  const setMode = useBudgetStore((s) => s.setMode)
  const openPanel = useBudgetStore((s) => s.openPanel)

  return (
    <header className="flex flex-col gap-4 border-b border-line bg-surface px-4 py-5 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-[32px] font-semibold tracking-[-0.01em] text-ink">Presupuesto</h1>
          <div className="mt-1 text-base text-ink-muted">
            {monthLabel} · día {dayOfMonth} de {daysInMonthCount}
          </div>
        </div>
        <button
          type="button"
          id="ajustar-presupuesto-btn"
          onClick={openPanel}
          className="min-h-11 rounded-md border border-green bg-green px-[18px] py-2.5 text-base font-semibold text-surface hover:bg-green-hover"
        >
          Ajustar presupuesto
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-[13px] font-semibold tracking-[0.08em] text-ink-muted uppercase">Vista</span>
        <div className="flex flex-wrap gap-1 rounded-md border border-line bg-canvas p-1">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              type="button"
              onClick={() => setMode(v.value)}
              aria-pressed={mode === v.value}
              className={`min-h-11 rounded-sm px-[18px] py-2 text-[15px] ${
                mode === v.value
                  ? 'border border-line bg-surface font-semibold text-ink'
                  : 'border border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
      {isAuthenticated && (
        <p className="text-sm text-ink-muted">
          Sin "Comprometido": todavía no hay movimientos planificados en Aurea, solo lo ya gastado.
        </p>
      )}
    </header>
  )
}

/** Pantalla Presupuesto: conclusión del mes, gasto por categoría y lo que no es consumo. */
export function BudgetPage() {
  const savedMessage = useBudgetStore((s) => s.savedMessage)
  const undoSave = useBudgetStore((s) => s.undoSave)
  const session = useAuthStore((s) => s.session)

  const { categories: realCategories } = useRealCategories()
  const { loading: loadingReal, budget: realBudget, refetch } = useRealBudget(realCategories)

  const isAuthenticated = session !== null
  const hasRealBudget = isAuthenticated && !loadingReal && realBudget !== null
  const viewModel = hasRealBudget ? toBudgetViewModel(realBudget!) : null

  async function handleSaveCategoryBudget(categoryId: string, amountCents: number) {
    return saveCategoryBudget(categoryId, amountCents)
  }

  return (
    <>
      <Header
        isAuthenticated={isAuthenticated}
        monthLabel={hasRealBudget ? realBudget!.monthLabel : budgetSummary.monthLabel}
        dayOfMonth={hasRealBudget ? realBudget!.dayOfMonth : budgetSummary.dayOfMonth}
        daysInMonthCount={hasRealBudget ? realBudget!.daysInMonthCount : budgetSummary.daysInMonth}
      />
      <main className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 lg:p-8">
        <MonthVerdictCard real={viewModel?.verdict} />
        <CategoryList categories={viewModel?.categories} />
        {!isAuthenticated && <NonSpendCards />}
        {savedMessage && <UndoBar message={savedMessage} onUndo={undoSave} />}
      </main>
      <AdjustBudgetPanel
        real={
          hasRealBudget
            ? {
                categories: realBudget!.categories.map((c) => ({ categoryId: c.categoryId, name: c.name, budgetedCents: c.budgetedCents })),
                onSave: handleSaveCategoryBudget,
                onSaved: refetch,
              }
            : undefined
        }
      />
    </>
  )
}
