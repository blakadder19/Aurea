/** Motor de cálculo de la evolución de gasto por categoría a lo largo de varios meses — puro, sin React ni Supabase. */

export interface CategoryTrendRow {
  /** null para el cajón "Sin clasificar". */
  categoryId: string | null
  name: string
  /** Alineado con `monthLabels` — mismo índice, mismo mes. */
  spentCentsByMonth: number[]
  totalSpentCents: number
}

export interface CategoryTrendResult {
  monthLabels: string[]
  /** Las categorías con más gasto total en el periodo, ordenadas de mayor a menor — nunca todas, para que la tabla siga siendo legible. */
  rows: CategoryTrendRow[]
}

export interface CategoryTrendEntry {
  monthIndex: number
  categoryId: string | null
  name: string
  spentCents: number
}

const MAX_TREND_CATEGORIES = 6

export function buildCategoryTrend(monthLabels: string[], entries: CategoryTrendEntry[]): CategoryTrendResult {
  const byCategory = new Map<string, { name: string; categoryId: string | null; spentCentsByMonth: number[] }>()

  for (const e of entries) {
    const key = e.categoryId ?? '__sin_clasificar__'
    let row = byCategory.get(key)
    if (!row) {
      row = { name: e.name, categoryId: e.categoryId, spentCentsByMonth: Array.from({ length: monthLabels.length }, () => 0) }
      byCategory.set(key, row)
    }
    row.spentCentsByMonth[e.monthIndex] += e.spentCents
  }

  const rows: CategoryTrendRow[] = [...byCategory.values()]
    .map((r) => ({ ...r, totalSpentCents: r.spentCentsByMonth.reduce((a, b) => a + b, 0) }))
    .filter((r) => r.totalSpentCents > 0)
    .sort((a, b) => b.totalSpentCents - a.totalSpentCents)
    .slice(0, MAX_TREND_CATEGORIES)

  return { monthLabels, rows }
}
