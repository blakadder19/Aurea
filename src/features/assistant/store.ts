import { create } from 'zustand'
import type { FreeformTurn } from './useFreeformAnswer'

interface AssistantState {
  selectedId: string | null
  freeformSubmitted: boolean
  /** Preguntas y respuestas ya cerradas de la conversación libre en curso — vive solo en memoria, se pierde al recargar la página. */
  freeformHistory: FreeformTurn[]
  askQuestion: (id: string) => void
  submitFreeform: () => void
  addFreeformTurn: (turn: FreeformTurn) => void
  clearFreeformHistory: () => void
}

export const useAssistantStore = create<AssistantState>((set) => ({
  selectedId: null,
  freeformSubmitted: false,
  freeformHistory: [],
  askQuestion: (id) => set({ selectedId: id, freeformSubmitted: false }),
  submitFreeform: () => set({ freeformSubmitted: true }),
  addFreeformTurn: (turn) => set((s) => ({ freeformHistory: [...s.freeformHistory, turn] })),
  clearFreeformHistory: () => set({ freeformHistory: [] }),
}))
