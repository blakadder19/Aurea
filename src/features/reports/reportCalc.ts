/**
 * Motor de cálculo del informe mensual — puro, sin React ni Supabase.
 * Un informe siempre es de un mes ya cerrado (o del que tengamos
 * movimientos), nunca del mes en curso: no tiene sentido "cerrar cuentas"
 * de un mes que todavía no ha terminado.
 */

export interface CategorySpend {
  name: string
  /** null para el cajón "Sin clasificar" — no corresponde a ninguna fila real de categories. */
  categoryId: string | null
  spentCents: number
  /** % del gasto total del mes, 0-100. */
  pctOfTotal: number
}

export interface MerchantSpend {
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
  /** null si no hay datos del mismo mes hace un año con los que comparar. */
  previousYearExpenseCents: number | null
  yearExpenseDeltaCents: number | null
  /** null si el mismo mes hace un año no tuvo gasto (no se puede calcular un % sobre 0). */
  yearExpenseDeltaPct: number | null
  /** Los 10 comercios con más gasto, ordenados de mayor a menor. */
  merchants: MerchantSpend[]
}

interface CategoryAgg {
  name: string
  categoryId: string | null
  spentCents: number
}

interface MerchantAgg {
  name: string
  spentCents: number
}

const MAX_MERCHANTS = 10

export function buildMonthlyReport(
  monthLabel: string,
  incomeCents: number,
  expenseCents: number,
  categorySpend: CategoryAgg[],
  previousExpenseCents: number | null,
  previousYearExpenseCents: number | null = null,
  merchantSpend: MerchantAgg[] = [],
): MonthlyReport {
  const netCents = incomeCents - expenseCents
  const savingsRatePct = incomeCents > 0 ? (netCents / incomeCents) * 100 : null

  const categories: CategorySpend[] = categorySpend
    .filter((c) => c.spentCents > 0)
    .sort((a, b) => b.spentCents - a.spentCents)
    .map((c) => ({
      name: c.name,
      categoryId: c.categoryId,
      spentCents: c.spentCents,
      pctOfTotal: expenseCents > 0 ? (c.spentCents / expenseCents) * 100 : 0,
    }))

  const expenseDeltaCents = previousExpenseCents !== null ? expenseCents - previousExpenseCents : null
  const expenseDeltaPct =
    previousExpenseCents !== null && previousExpenseCents > 0 && expenseDeltaCents !== null
      ? (expenseDeltaCents / previousExpenseCents) * 100
      : null

  const yearExpenseDeltaCents = previousYearExpenseCents !== null ? expenseCents - previousYearExpenseCents : null
  const yearExpenseDeltaPct =
    previousYearExpenseCents !== null && previousYearExpenseCents > 0 && yearExpenseDeltaCents !== null
      ? (yearExpenseDeltaCents / previousYearExpenseCents) * 100
      : null

  const merchants: MerchantSpend[] = merchantSpend
    .filter((m) => m.spentCents > 0)
    .sort((a, b) => b.spentCents - a.spentCents)
    .slice(0, MAX_MERCHANTS)
    .map((m) => ({ name: m.name, spentCents: m.spentCents, pctOfTotal: expenseCents > 0 ? (m.spentCents / expenseCents) * 100 : 0 }))

  return {
    monthLabel,
    incomeCents,
    expenseCents,
    netCents,
    savingsRatePct,
    categories,
    previousExpenseCents,
    expenseDeltaCents,
    expenseDeltaPct,
    previousYearExpenseCents,
    yearExpenseDeltaCents,
    yearExpenseDeltaPct,
    merchants,
  }
}

export interface MonthlyTrendPoint {
  /** "ago 26" — mes corto + año de 2 cifras, para eje X sin ambigüedad entre años. */
  monthLabel: string
  incomeCents: number
  expenseCents: number
  netCents: number
}

interface MonthlyTrendInput {
  monthLabel: string
  incomeCents: number
  expenseCents: number
}

/** De varios meses (cerrados o no, ya vienen agregados) a los puntos que pinta MonthlyTrendChart — nunca inventa un mes sin datos, solo lo muestra en 0. */
export function buildMonthlyTrend(months: MonthlyTrendInput[]): MonthlyTrendPoint[] {
  return months.map((m) => ({ ...m, netCents: m.incomeCents - m.expenseCents }))
}
