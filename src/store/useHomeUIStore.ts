import { create } from 'zustand'

export type ViewMode = 'resumen' | 'detalle'

interface HomeUIState {
  mode: ViewMode
  setMode: (mode: ViewMode) => void
  showCalc: boolean
  toggleCalc: () => void
}

/** Estado de UI de Inicio: modo Resumen/Detalle y desglose de "Disponible hoy" abierto. */
export const useHomeUIStore = create<HomeUIState>((set) => ({
  mode: 'resumen',
  setMode: (mode) => set({ mode }),
  showCalc: false,
  toggleCalc: () => set((s) => ({ showCalc: !s.showCalc })),
}))
