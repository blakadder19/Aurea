import { create } from 'zustand'
import type { ConnectionStatus } from '../../data/settings'
import { CURRENCY_OPTIONS, DATE_FORMAT_OPTIONS, csvColumns } from '../../data/settings'

export type Step = 1 | 2 | 3

interface SettingsState {
  connectionOverrides: Record<string, { status: ConnectionStatus; detail: string }>
  reconnect: (id: string) => void

  importOpen: boolean
  step: Step
  maxStepReached: Step
  mapping: Record<string, string>
  importConfirmed: boolean
  openImport: () => void
  closeImport: () => void
  goToStep: (step: Step) => void
  goNext: () => void
  goBack: () => void
  setMapping: (fileColumn: string, field: string) => void
  confirmImport: () => void

  currency: string
  dateFormat: string
  budgetMonthStart: number
  setCurrency: (value: string) => void
  setDateFormat: (value: string) => void
  setBudgetMonthStart: (value: number) => void

  demoDataCleared: boolean
  clearDemoData: () => void
}

const initialMapping = Object.fromEntries(csvColumns.map((c) => [c.fileColumn, c.field]))

export const useSettingsStore = create<SettingsState>((set) => ({
  connectionOverrides: {},
  // TODO(conexión real): sustituir esta simulación por una llamada a Enable Banking
  // (vía server/, reutilizado de blakadder19/Aurea---Finanzas@master) que reautorice
  // la conexión y guarde el nuevo estado en Supabase.
  reconnect: (id) => {
    set((state) => ({
      connectionOverrides: { ...state.connectionOverrides, [id]: { status: 'syncing', detail: 'Sincronizando ahora…' } },
    }))
    setTimeout(() => {
      set((state) => ({
        connectionOverrides: {
          ...state.connectionOverrides,
          [id]: { status: 'synced', detail: 'Última actualización hace un momento' },
        },
      }))
    }, 1200)
  },

  importOpen: false,
  step: 1,
  maxStepReached: 1,
  mapping: initialMapping,
  importConfirmed: false,
  openImport: () => set({ importOpen: true, step: 1, maxStepReached: 1, importConfirmed: false }),
  closeImport: () => set({ importOpen: false }),
  goToStep: (step) => set((state) => (step <= state.maxStepReached ? { step } : state)),
  goNext: () =>
    set((state) => {
      const next = Math.min(3, state.step + 1) as Step
      return { step: next, maxStepReached: Math.max(state.maxStepReached, next) as Step }
    }),
  goBack: () => set((state) => ({ step: Math.max(1, state.step - 1) as Step })),
  setMapping: (fileColumn, field) => set((state) => ({ mapping: { ...state.mapping, [fileColumn]: field } })),
  // TODO(importación real): sustituir csvImportResult (data/settings.ts) por el parseo
  // real del archivo subido y persistir las filas dadas de alta en Supabase.
  confirmImport: () => set({ importConfirmed: true }),

  currency: CURRENCY_OPTIONS[0],
  dateFormat: DATE_FORMAT_OPTIONS[0],
  budgetMonthStart: 1,
  setCurrency: (value) => set({ currency: value }),
  setDateFormat: (value) => set({ dateFormat: value }),
  setBudgetMonthStart: (value) => set({ budgetMonthStart: value }),

  demoDataCleared: false,
  clearDemoData: () => set({ demoDataCleared: true }),
}))
