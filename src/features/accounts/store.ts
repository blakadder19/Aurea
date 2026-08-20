import { create } from 'zustand'

export type AccountsView = 'resumen' | 'detalle'

interface AccountsUIState {
  mode: AccountsView
  setMode: (mode: AccountsView) => void

  panelAccountId: string | null
  openPanel: (id: string) => void
  closePanel: () => void
}

export const useAccountsStore = create<AccountsUIState>((set) => ({
  mode: 'resumen',
  setMode: (mode) => set({ mode }),

  panelAccountId: null,
  openPanel: (id) => set({ panelAccountId: id }),
  closePanel: () => set({ panelAccountId: null }),
}))
