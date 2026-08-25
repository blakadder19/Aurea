/**
 * Motor de cálculo del informe mensual — puro, sin React ni Supabase.
 * Un informe siempre es de un mes ya cerrado (o del que tengamos
 * movimientos), nunca del mes en curso: no tiene sentido "cerrar cuentas"
 * de un mes que todavía no ha terminado.
 */

export interface CategorySpend {
  name: string
  spentCents: number
  /** % del gasto total del mes, 0-100. */
  pctOfTotal: number
}

export interface MonthlyReport {
  monthLabel: string
  incomeCents: number
  expenseCents: number
  netCents: number
  /** null si no hubo ningún ingreso ese mes (no tiene sentido una tasa de ahorro sin ingresos). */
  savingsRatePct: number | null
  /** Categorías con gasto > 0, ordenadas de mayor a menor. */
  categories: CategorySpend[]
  /** null si no hay datos del mes anterior con los que comparar. */
  previousExpenseCents: number | null
  expenseDeltaCents: number | null
  /** null si el mes anterior no tuvo gasto (no se puede calcular un % sobre 0). */
  expenseDeltaPct: number | null
}

interface CategoryAgg {
  name: string
  spentCents: number
}

export function buildMonthlyReport(
  monthLabel: string,
  incomeCents: number,
  expenseCents: number,
  categorySpend: CategoryAgg[],
  previousExpenseCents: number | null,
): MonthlyReport {
  const netCents = incomeCents - expenseCents
  const savingsRatePct = incomeCents > 0 ? (netCents / incomeCents) * 100 : null

  const categories: CategorySpend[] = categorySpend
    .filter((c) => c.spentCents > 0)
    .sort((a, b) => b.spentCents - a.spentCents)
    .map((c) => ({ name: c.name, spentCents: c.spentCents, pctOfTotal: expenseCents > 0 ? (c.spentCents / expenseCents) * 100 : 0 }))

  const expenseDeltaCents = previousExpenseCents !== null ? expenseCents - previousExpenseCents : null
  const expenseDeltaPct =
    previousExpenseCents !== null && previousExpenseCents > 0 && expenseDeltaCents !== null
      ? (expenseDeltaCents / previousExpenseCents) * 100
      : null

  return { monthLabel, incomeCents, expenseCents, netCents, savingsRatePct, categories, previousExpenseCents, expenseDeltaCents, expenseDeltaPct }
}
