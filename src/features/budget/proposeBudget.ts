/**
 * Propuesta de presupuesto a partir de lo que ya gastas. Motor puro, sin
 * React ni Supabase.
 *
 * Por qué existe: poner presupuesto empezaba en blanco, con nueve casillas
 * a cero. La app lleva meses viendo lo que gastas en cada categoría, así
 * que puede proponer un punto de partida en vez de pedirte que te lo
 * inventes. Sigue siendo una propuesta: se rellena el formulario y tú
 * decides antes de guardar.
 */

/** Gasto real de una categoría, un importe por mes (en céntimos, positivo). */
export interface CategoryHistory {
  categoryId: string
  spentCentsByMonth: number[]
}

/** A cuánto se redondea la propuesta: una cifra redonda se lee como una decisión, no como un volcado. */
const ROUND_TO_CENTS = 1000

/**
 * La mediana, no la media: con pocos meses, un mes raro (una mudanza, un
 * viaje) arrastra la media y te deja un presupuesto que no se parece a tu
 * vida normal. La mediana lo ignora.
 */
function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

function roundUpToNearest(cents: number, step: number): number {
  return Math.ceil(cents / step) * step
}

/**
 * Un importe por categoría, redondeado hacia arriba a la decena de euros.
 * Hacia arriba a propósito: un presupuesto que ya nace por debajo de lo
 * que sueles gastar está incumplido desde el día uno.
 *
 * Las categorías sin gasto en ningún mes se quedan fuera: proponer 0 € no
 * aporta nada y ensucia el formulario.
 */
export function proposeBudgetFromHistory(histories: CategoryHistory[]): Record<string, number> {
  const proposal: Record<string, number> = {}
  for (const { categoryId, spentCentsByMonth } of histories) {
    const months = spentCentsByMonth.filter((cents) => cents > 0)
    if (months.length === 0) continue
    const cents = roundUpToNearest(median(months), ROUND_TO_CENTS)
    if (cents > 0) proposal[categoryId] = cents
  }
  return proposal
}
