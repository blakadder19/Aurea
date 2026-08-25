/**
 * Motor de cálculo del ritmo de presupuesto — puro, sin React ni Supabase.
 * Inspirado en el mismo cálculo de Aurea Finanzas (computeRealBudget):
 * ritmo esperado = presupuestado × (días transcurridos / días del mes),
 * simplificado para Aurea: sin multidivisa, sin "comprometido" (no hay
 * movimientos planificados todavía), sin jerarquía de categorías.
 */

export type BudgetStatus = 'Al día' | 'Por encima' | 'Agotado' | 'Sin presupuesto'

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

  let status: BudgetStatus
  if (budgetedCents === 0) status = 'Sin presupuesto'
  else if (spentCents >= budgetedCents) status = 'Agotado'
  else if (paceDeltaCents !== null && paceDeltaCents > 0) status = 'Por encima'
  else status = 'Al día'

  return { budgetedCents, spentCents, remainingCents, expectedPaceCents, paceDeltaCents, status }
}

/** Previsión de cierre: proyección lineal del gasto acumulado, nunca por debajo de lo ya gastado. */
export function forecastCents(spentCents: number, daysElapsed: number, totalDays: number): number {
  if (daysElapsed <= 0) return spentCents
  return Math.max(spentCents, Math.round((spentCents / daysElapsed) * totalDays))
}

/** "2026-08-25", en fecha local (nunca UTC — evita que un cambio de zona horaria desplace el día). */
export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Ciclo de presupuesto real: el usuario puede elegir que "el mes" empiece
 * un día distinto al 1 (p. ej. si cobra el 25). `startDay` viene siempre de
 * BUDGET_MONTH_START_OPTIONS (1, 5, 15 o 25 — nunca más de 28), así que no
 * hace falta recortar el día como en addMonths.
 */
export function cycleStart(today: Date, startDay: number): Date {
  const monthOffset = today.getDate() >= startDay ? 0 : -1
  return new Date(today.getFullYear(), today.getMonth() + monthOffset, startDay)
}

/** Primer día del siguiente ciclo (excluido del ciclo actual). */
export function cycleEnd(start: Date): Date {
  return new Date(start.getFullYear(), start.getMonth() + 1, start.getDate())
}

/** Longitud del ciclo en días — varía según los meses que abarque (28-31). */
export function daysInCycle(start: Date): number {
  return Math.round((cycleEnd(start).getTime() - start.getTime()) / 86_400_000)
}

/** Días transcurridos del ciclo, acotado a [1, días del ciclo]. */
export function daysElapsedInCycle(today: Date, start: Date): number {
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const elapsed = Math.round((startOfToday.getTime() - start.getTime()) / 86_400_000) + 1
  return Math.min(Math.max(elapsed, 1), daysInCycle(start))
}
