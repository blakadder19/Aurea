import { create } from 'zustand'

export type RecurringView = 'lista' | 'calendario'

interface RecurringUIState {
  view: RecurringView
  setView: (view: RecurringView) => void

  panelItemId: string | null
  openPanel: (id: string) => void
  closePanel: () => void

  undoMessage: string | null
  showUndo: (message: string) => void
  dismissUndo: () => void
}

export const useRecurringStore = create<RecurringUIState>((set) => ({
  view: 'lista',
  setView: (view) => set({ view }),

  panelItemId: null,
  openPanel: (id) => set({ panelItemId: id }),
  closePanel: () => set({ panelItemId: null }),

  undoMessage: null,
  showUndo: (message) => set({ undoMessage: message }),
  dismissUndo: () => set({ undoMessage: null }),
}))
