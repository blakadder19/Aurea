import { create } from 'zustand'

interface DebtsUIState {
  simulatorOpen: boolean
  openSimulator: () => void
  closeSimulator: () => void
}

export const useDebtsStore = create<DebtsUIState>((set) => ({
  simulatorOpen: false,
  openSimulator: () => set({ simulatorOpen: true }),
  closeSimulator: () => set({ simulatorOpen: false }),
}))
