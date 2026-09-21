import type { Transaction, TransactionTag } from '../data/transactions'

/**
 * Las etiquetas que llevan TODOS los movimientos seleccionados — motor puro.
 *
 * Es lo que decide si "Quitar etiqueta" tiene sentido: quitar una que solo
 * lleva la mitad de la selección haría dos cosas distintas a la vez sin
 * decirlo. Si no comparten ninguna, no hay nada que ofrecer.
 */
export function sharedTagsOf(transactions: Transaction[], selectedIds: Set<string> | string[]): TransactionTag[] {
  const ids = selectedIds instanceof Set ? selectedIds : new Set(selectedIds)
  if (ids.size === 0) return []

  const selected = transactions.filter((t) => ids.has(t.id))
  // Si alguno de los seleccionados no está entre los cargados no se puede
  // afirmar que comparten nada: mejor no ofrecer que ofrecer de más.
  if (selected.length !== ids.size) return []

  const [first, ...rest] = selected
  const shared = new Map((first.tags ?? []).map((tag) => [tag.id, tag]))
  for (const t of rest) {
    const suyas = new Set((t.tags ?? []).map((tag) => tag.id))
    for (const id of Array.from(shared.keys())) if (!suyas.has(id)) shared.delete(id)
    if (shared.size === 0) break
  }
  return [...shared.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'))
}
