import { create } from 'zustand'
import { goals } from '../../data/goals'

export type ContributionTargetId = 'emergencia' | (typeof goals)[number]['id']

type Allocations = Record<ContributionTargetId, number>

const emptyAllocations: Allocations = {
  emergencia: 0,
  ...(Object.fromEntries(goals.map((g) => [g.id, 0])) as Record<string, number>),
}

interface GoalsUIState {
  panelOpen: boolean
  openPanel: () => void
  closePanel: () => void

  /** Aportaciones confirmadas acumuladas, sumadas al `saved` base de cada objetivo. */
  extraSaved: Allocations
  lastAllocations: Allocations | null
  confirmContribution: (allocations: Allocations) => void

  undoMessage: string | null
  dismissUndo: () => void
  undoLastContribution: () => void
}

export const useGoalsStore = create<GoalsUIState>((set, get) => ({
  panelOpen: false,
  openPanel: () => set({ panelOpen: true }),
  closePanel: () => set({ panelOpen: false }),

  extraSaved: { ...emptyAllocations },
  lastAllocations: null,

  confirmContribution: (allocations) => {
    const current = get().extraSaved
    const next = { ...current }
    let total = 0
    for (const id of Object.keys(allocations) as ContributionTargetId[]) {
      next[id] = (current[id] ?? 0) + (allocations[id] ?? 0)
      total += allocations[id] ?? 0
    }
    set({
      extraSaved: next,
      lastAllocations: allocations,
      panelOpen: false,
      undoMessage: `Aportación de ${total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} € registrada.`,
    })
  },

  undoMessage: null,
  dismissUndo: () => set({ undoMessage: null }),
  undoLastContribution: () => {
    const { extraSaved, lastAllocations } = get()
    if (!lastAllocations) {
      set({ undoMessage: null })
      return
    }
    const next = { ...extraSaved }
    for (const id of Object.keys(lastAllocations) as ContributionTargetId[]) {
      next[id] = (extraSaved[id] ?? 0) - (lastAllocations[id] ?? 0)
    }
    set({ extraSaved: next, lastAllocations: null, undoMessage: null })
  },
}))
