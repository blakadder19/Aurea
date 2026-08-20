import { create } from 'zustand'

interface AssistantState {
  selectedId: string | null
  freeformSubmitted: boolean
  askQuestion: (id: string) => void
  submitFreeform: () => void
}

export const useAssistantStore = create<AssistantState>((set) => ({
  selectedId: null,
  freeformSubmitted: false,
  askQuestion: (id) => set({ selectedId: id, freeformSubmitted: false }),
  submitFreeform: () => set({ freeformSubmitted: true }),
}))
