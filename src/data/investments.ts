/**
 * Datos ficticios de Inversiones — miércoles 19 de agosto de 2026.
 * Cuadran con PLAN.md: 38.920 € valor · 32.400 € aportado · +6.520 € · +20,1 %.
 * Cripto (posición aparte, no entra en estas cifras de cabecera): 4.310 €
 * sobre 3.000 € aportados.
 */

export const portfolioSummary = {
  currentValue: 38920.0,
  contributed: 32400.0,
  gain: 6520.0,
  gainPct: 20.1,
  syncedAt: '08:42',
}

/** 12 puntos mensuales, solo tendencia — cotizaciones simuladas. */
export const valueSeries = [
  28900.0, 29850.0, 30600.0, 31200.0, 32100.0, 33400.0, 34200.0, 35600.0, 36500.0, 37400.0, 38100.0, 38920.0,
]

export interface Position {
  id: string
  name: string
  units: number | null
  avgCost: number | null
  value: number
  contributed: number
  gain: number
  gainPct: number
  productType: string
}

export const positions: Position[] = [
  {
    id: 'fondo-indexado',
    name: 'Fondo indexado mundial',
    units: 412.6,
    avgCost: 78.55,
    value: 38920.0,
    contributed: 32400.0,
    gain: 6520.0,
    gainPct: 20.1,
    productType: 'Fondos de inversión',
  },
  {
    id: 'cripto',
    name: 'Cripto (Bitcoin y Ether)',
    units: null,
    avgCost: null,
    value: 4310.0,
    contributed: 3000.0,
    gain: 1310.0,
    gainPct: 43.7,
    productType: 'Cripto',
  },
]

export interface AllocationClass {
  id: string
  name: string
  currentPct: number
  targetPct: number
  color: 'plum' | 'info' | 'warning'
}

export const allocation: AllocationClass[] = [
  { id: 'renta-variable', name: 'Renta variable', currentPct: 72, targetPct: 65, color: 'plum' },
  { id: 'renta-fija', name: 'Renta fija', currentPct: 17, targetPct: 25, color: 'info' },
  { id: 'cripto', name: 'Cripto', currentPct: 11, targetPct: 10, color: 'warning' },
]

export const rebalanceRecommendation = {
  amount: 2720.0,
  from: 'renta variable',
  to: 'renta fija',
  targetSummary: '65/25/10',
}
