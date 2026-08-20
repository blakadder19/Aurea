import { create } from 'zustand'

export type InvestmentsView = 'resumen' | 'detalle'

interface InvestmentsUIState {
  mode: InvestmentsView
  setMode: (mode: InvestmentsView) => void
}

export const useInvestmentsStore = create<InvestmentsUIState>((set) => ({
  mode: 'resumen',
  setMode: (mode) => set({ mode }),
}))
