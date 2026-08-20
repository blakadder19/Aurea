import { create } from 'zustand'
import { BASE_SCENARIO, DEFAULT_HORIZON, DEFAULT_WITHDRAWAL_RATE } from '../../data/planning'
import type { ScenarioParams } from './domain'

interface PlanningState {
  params: ScenarioParams
  horizonYears: number
  withdrawalRate: number
  setParam: <K extends keyof ScenarioParams>(key: K, value: ScenarioParams[K]) => void
  setHorizonYears: (years: number) => void
  setWithdrawalRate: (rate: number) => void
}

export const usePlanningStore = create<PlanningState>((set) => ({
  params: { ...BASE_SCENARIO },
  horizonYears: DEFAULT_HORIZON,
  withdrawalRate: DEFAULT_WITHDRAWAL_RATE,
  setParam: (key, value) => set((state) => ({ params: { ...state.params, [key]: value } })),
  setHorizonYears: (years) => set({ horizonYears: years }),
  setWithdrawalRate: (rate) => set({ withdrawalRate: rate }),
}))
