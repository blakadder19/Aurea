import type { ScenarioParams } from '../features/planning/domain'
import { debts } from './debts'
import { netWorth } from './demo'

export const STARTING_NET_WORTH = netWorth

const totalDebtBalance = debts.reduce((sum, d) => sum + d.balance, 0)
/** Tasa media ponderada de las deudas actuales: lo que se deja de pagar en intereses por cada € de pago extra. */
export const AVG_DEBT_RATE = debts.reduce((sum, d) => sum + d.balance * d.annualRate, 0) / totalDebtBalance

export const BASE_SCENARIO: ScenarioParams = {
  ingresos: 3790,
  gastos: 2400,
  aportacion: 300,
  rentabilidad: 5,
  inflacion: 2,
  compraExtraordinaria: 0,
  pagoExtraDeuda: 0,
}

export const HORIZON_OPTIONS = [5, 10, 20, 30] as const
export const DEFAULT_HORIZON = 10
export const DEFAULT_WITHDRAWAL_RATE = 4

/**
 * Edad actual de Marta Ríos: no está definida en ningún corte anterior.
 * Se asume 34 años solo para poder mostrar una edad estimada de llegada a
 * la independencia financiera (ver docs/DUDAS.md). En real no se fabrica:
 * ver `currentAge: null` en features/planning/store.ts.
 */
export const ASSUMED_CURRENT_AGE = 34
