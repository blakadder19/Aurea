import { create } from 'zustand'
import { budgetCategories } from '../../data/budget'

export type BudgetView = 'resumen' | 'detalle'

interface BudgetUIState {
  mode: BudgetView
  setMode: (mode: BudgetView) => void

  /** Presupuestado editable por categoría. Se inicializa con los datos base. */
  categoryBudgets: Record<string, number>
  previousBudgets: Record<string, number> | null

  panelOpen: boolean
  openPanel: () => void
  closePanel: () => void

  savedMessage: string | null
  dismissSaved: () => void
  saveBudgets: (values: Record<string, number>) => void
  undoSave: () => void
}

const baseBudgets = Object.fromEntries(budgetCategories.map((c) => [c.id, c.budgeted]))

export const useBudgetStore = create<BudgetUIState>((set, get) => ({
  mode: 'resumen',
  setMode: (mode) => set({ mode }),

  categoryBudgets: baseBudgets,
  previousBudgets: null,

  panelOpen: false,
  openPanel: () => set({ panelOpen: true }),
  closePanel: () => set({ panelOpen: false }),

  savedMessage: null,
  dismissSaved: () => set({ savedMessage: null }),
  saveBudgets: (values) =>
    set({
      previousBudgets: get().categoryBudgets,
      categoryBudgets: values,
      panelOpen: false,
      savedMessage: 'Presupuesto actualizado por categoría.',
    }),
  undoSave: () =>
    set((s) => ({
      categoryBudgets: s.previousBudgets ?? s.categoryBudgets,
      previousBudgets: null,
      savedMessage: null,
    })),
}))
