import { create } from 'zustand'
import { ASSUMED_CURRENT_AGE, AVG_DEBT_RATE, BASE_SCENARIO, DEFAULT_HORIZON, DEFAULT_WITHDRAWAL_RATE, STARTING_NET_WORTH } from '../../data/planning'
import { CONTEXT_DATE } from '../../data/demo'
import type { ScenarioParams } from './domain'

interface PlanningState {
  params: ScenarioParams
  horizonYears: number
  withdrawalRate: number
  /** Punto de partida de la proyección: patrimonio neto real o demo. */
  startingNetWorth: number
  /** Tasa media ponderada de las deudas actuales, real o demo. */
  avgDebtRate: number
  /** Escenario base contra el que se compara "este escenario" y del que parten los tres guardados. */
  baseParams: ScenarioParams
  /** Edad actual conocida — null en real (no hay dato de edad en ningún sitio, no se fabrica). */
  currentAge: number | null
  /** "Hoy" para calcular el año objetivo — CONTEXT_DATE en demo, fecha real en real. */
  today: Date
  setParam: <K extends keyof ScenarioParams>(key: K, value: ScenarioParams[K]) => void
  setHorizonYears: (years: number) => void
  setWithdrawalRate: (rate: number) => void
  /** Sustituye el punto de partida por datos reales del usuario (patrimonio, deuda, ingresos/gastos medios). */
  hydrateReal: (input: { startingNetWorth: number; avgDebtRate: number; ingresos: number; gastos: number }) => void
}

export const usePlanningStore = create<PlanningState>((set) => ({
  params: { ...BASE_SCENARIO },
  horizonYears: DEFAULT_HORIZON,
  withdrawalRate: DEFAULT_WITHDRAWAL_RATE,
  startingNetWorth: STARTING_NET_WORTH,
  avgDebtRate: AVG_DEBT_RATE,
  baseParams: { ...BASE_SCENARIO },
  currentAge: ASSUMED_CURRENT_AGE,
  today: CONTEXT_DATE,
  setParam: (key, value) => set((state) => ({ params: { ...state.params, [key]: value } })),
  setHorizonYears: (years) => set({ horizonYears: years }),
  setWithdrawalRate: (rate) => set({ withdrawalRate: rate }),
  hydrateReal: ({ startingNetWorth, avgDebtRate, ingresos, gastos }) =>
    set(() => {
      const baseParams: ScenarioParams = { ...BASE_SCENARIO, ingresos, gastos, aportacion: 0 }
      return { startingNetWorth, avgDebtRate, baseParams, params: { ...baseParams }, currentAge: null, today: new Date() }
    }),
}))
