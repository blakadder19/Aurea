import type { Transaction } from '../../data/transactions'
import { formatMonthYearLong } from '../../lib/format'

/**
 * Parte la lista de movimientos en meses. Motor puro, sin React.
 *
 * Por qué existe: 401 filas seguidas se leen como un muro. Separadas por
 * mes, con lo gastado en cada uno, la lista se recorre en vez de mirarse.
 */

export interface MonthGroup {
  /** "2026-08" — clave estable, no visible. */
  key: string
  /** "agosto de 2026". */
  label: string
  transactions: Transaction[]
  /** Suma de los cargos del mes, en positivo. Los abonos no restan aquí: el interés es cuánto salió. */
  spent: number
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number)
  return formatMonthYearLong(month - 1, year)
}

/**
 * Conserva el orden de entrada (la tabla ya llega ordenada por fecha
 * descendente): agrupar no debe reordenar nada por su cuenta.
 *
 * Los movimientos sin fecha —la demo no la trae— se quedan juntos en un
 * grupo sin cabecera, para no inventarles un mes.
 */
export function groupByMonth(transactions: Transaction[]): MonthGroup[] {
  const groups: MonthGroup[] = []
  const byKey = new Map<string, MonthGroup>()

  for (const t of transactions) {
    const dateISO = 'dateISO' in t ? ((t as { dateISO: string | null }).dateISO ?? null) : null
    const key = dateISO ? dateISO.slice(0, 7) : ''
    let group = byKey.get(key)
    if (!group) {
      group = { key, label: key ? monthLabel(key) : '', transactions: [], spent: 0 }
      byKey.set(key, group)
      groups.push(group)
    }
    group.transactions.push(t)
    if (t.importe < 0) group.spent += -t.importe
  }

  return groups
}
