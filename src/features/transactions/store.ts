import { create } from 'zustand'
import { defaultSelectedIds, initialReviewItems, type ReviewItem } from '../../data/transactions'

export type TransactionsView = 'tabla' | 'revision'

export const ALL_ACCOUNTS = 'Todas las cuentas'
export const ALL_CATEGORIES = 'Todas las categorías'
export const ALL_STATUSES = 'Cualquier estado'
export const STATUS_NEEDS_REVIEW = 'Requiere revisión'
export const STATUS_CONFIRMED = 'Confirmado'
export const DATE_ALL = 'Todo'
export const DATE_THIS_MONTH = 'Este mes'
export const DATE_LAST_3_MONTHS = 'Últimos 3 meses'

interface TransactionsUIState {
  view: TransactionsView
  setView: (view: TransactionsView) => void

  searchQuery: string
  setSearchQuery: (query: string) => void

  accountFilter: string
  setAccountFilter: (account: string) => void
  categoryFilter: string
  setCategoryFilter: (category: string) => void
  statusFilter: string
  setStatusFilter: (status: string) => void
  /** Solo se usa en real — la demo mantiene su propio "Este mes" cosmético en el propio componente. */
  dateFilter: string
  setDateFilter: (date: string) => void

  selectedIds: Set<string>
  toggleSelected: (id: string) => void
  setSelectedIds: (ids: string[]) => void
  clearSelection: () => void

  panelTransactionId: string | null
  openPanel: (id: string) => void
  closePanel: () => void

  reviewItems: ReviewItem[]
  resolveReview: (id: string, message: string) => void

  undoMessage: string | null
  showUndo: (message: string) => void
  dismissUndo: () => void
}

export const useTransactionsStore = create<TransactionsUIState>((set) => ({
  view: 'tabla',
  setView: (view) => set({ view }),

  searchQuery: '',
  setSearchQuery: (searchQuery) => set({ searchQuery }),

  accountFilter: ALL_ACCOUNTS,
  setAccountFilter: (accountFilter) => set({ accountFilter }),
  categoryFilter: ALL_CATEGORIES,
  setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
  statusFilter: ALL_STATUSES,
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  dateFilter: DATE_ALL,
  setDateFilter: (dateFilter) => set({ dateFilter }),

  selectedIds: new Set(defaultSelectedIds),
  toggleSelected: (id) =>
    set((s) => {
      const next = new Set(s.selectedIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { selectedIds: next }
    }),
  setSelectedIds: (ids) => set({ selectedIds: new Set(ids) }),
  clearSelection: () => set({ selectedIds: new Set() }),

  panelTransactionId: null,
  openPanel: (id) => set({ panelTransactionId: id }),
  closePanel: () => set({ panelTransactionId: null }),

  reviewItems: initialReviewItems,
  resolveReview: (id, message) =>
    set((s) => ({
      reviewItems: s.reviewItems.filter((item) => item.id !== id),
      undoMessage: message,
    })),

  undoMessage: null,
  showUndo: (message) => set({ undoMessage: message }),
  dismissUndo: () => set({ undoMessage: null }),
}))
