import { create } from 'zustand'
import { defaultSelectedIds, initialReviewItems, type ReviewItem } from '../../data/transactions'

export type TransactionsView = 'tabla' | 'revision'

interface TransactionsUIState {
  view: TransactionsView
  setView: (view: TransactionsView) => void

  searchQuery: string
  setSearchQuery: (query: string) => void

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
