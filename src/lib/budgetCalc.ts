/**
 * Motor de cálculo del ritmo de presupuesto — puro, sin React ni Supabase.
 * Inspirado en el mismo cálculo de Aurea Finanzas (computeRealBudget):
 * ritmo esperado = presupuestado × (días transcurridos / días del mes),
 * simplificado para Aurea: sin multidivisa, sin "comprometido" (no hay
 * movimientos planificados todavía), sin jerarquía de categorías.
 */

export type BudgetStatus = 'Al día' | 'Por encima' | 'Agotado'

export interface CategoryPace {
  budgetedCents: number
  spentCents: number
  remainingCents: number
  /** null si el presupuesto de la categoría es 0 (no tiene sentido "ritmo" sin límite). */
  expectedPaceCents: number | null
  paceDeltaCents: number | null
  status: BudgetStatus
}

/** Días del mes de `year`-`monthIndex0` (0 = enero). */
export function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate()
}

/** Días transcurridos del mes en curso, acotado a [1, díasDelMes] — nunca 0 ni más del mes. */
export function daysElapsedInMonth(today: Date): number {
  return Math.min(Math.max(today.getDate(), 1), daysInMonth(today.getFullYear(), today.getMonth()))
}

export function computeCategoryPace(budgetedCents: number, spentCents: number, daysElapsed: number, totalDays: number): CategoryPace {
  const remainingCents = budgetedCents - spentCents
  const expectedPaceCents = budgetedCents > 0 ? Math.round((budgetedCents * daysElapsed) / totalDays) : null
  const paceDeltaCents = expectedPaceCents !== null ? spentCents - expectedPaceCents : null

  let status: BudgetStatus = 'Al día'
  if (budgetedCents > 0 && spentCents >= budgetedCents) status = 'Agotado'
  else if (paceDeltaCents !== null && paceDeltaCents > 0) status = 'Por encima'

  return { budgetedCents, spentCents, remainingCents, expectedPaceCents, paceDeltaCents, status }
}

/** Previsión de cierre: proyección lineal del gasto acumulado, nunca por debajo de lo ya gastado. */
export function forecastCents(spentCents: number, daysElapsed: number, totalDays: number): number {
  if (daysElapsed <= 0) return spentCents
  return Math.max(spentCents, Math.round((spentCents / daysElapsed) * totalDays))
}
