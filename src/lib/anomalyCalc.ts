/**
 * Detección de anomalías en movimientos — puro, sin React ni Supabase, y
 * sin IA: dos comprobaciones deterministas y explicables (mismo comercio +
 * mismo importe a pocos días, o un importe muy por encima de lo habitual
 * para ese comercio), no conjeturas de un modelo de lenguaje. Un exceso o
 * un duplicado exacto se puede calcular con certeza; no hace falta
 * adivinarlo.
 */

interface TxLike {
  id: string
  comercio: string
  importe: number
  dateISO: string | null
}

export interface DuplicateFlag {
  transactionId: string
  matchedTransactionId: string
  comercio: string
  importeAbs: number
  daysApart: number
}

function daysBetween(aIso: string, bIso: string): number {
  return Math.abs(new Date(aIso).getTime() - new Date(bIso).getTime()) / 86_400_000
}

/** Mismo comercio + mismo importe exacto, a pocos días de distancia — posible cobro duplicado por error. */
export function findPossibleDuplicates(transactions: TxLike[], maxDaysApart = 3): DuplicateFlag[] {
  const expenses = transactions.filter((t) => t.importe < 0 && t.dateISO)
  const flags: DuplicateFlag[] = []
  const seenPairs = new Set<string>()

  for (let i = 0; i < expenses.length; i++) {
    for (let j = i + 1; j < expenses.length; j++) {
      const a = expenses[i]
      const b = expenses[j]
      if (a.comercio !== b.comercio || a.importe !== b.importe) continue
      const gap = daysBetween(a.dateISO!, b.dateISO!)
      if (gap > maxDaysApart) continue
      const pairKey = [a.id, b.id].sort().join('|')
      if (seenPairs.has(pairKey)) continue
      seenPairs.add(pairKey)
      flags.push({ transactionId: a.id, matchedTransactionId: b.id, comercio: a.comercio, importeAbs: Math.abs(a.importe), daysApart: Math.round(gap) })
    }
  }
  return flags
}

export interface UnusualAmountFlag {
  transactionId: string
  comercio: string
  importeAbs: number
  typicalAbs: number
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/**
 * Un cargo muy por encima de lo habitual para ese mismo comercio, comparado
 * con la mediana de sus propios cargos — nunca con un promedio general que
 * mezclaría comercios distintos. Exige un mínimo de historial por comercio
 * para que "lo habitual" signifique algo.
 */
export function findUnusualAmounts(transactions: TxLike[], minHistoryCount = 3, ratioThreshold = 2.5): UnusualAmountFlag[] {
  const byComercio = new Map<string, TxLike[]>()
  for (const t of transactions.filter((t) => t.importe < 0)) {
    const list = byComercio.get(t.comercio) ?? []
    list.push(t)
    byComercio.set(t.comercio, list)
  }

  const flags: UnusualAmountFlag[] = []
  for (const [comercio, txs] of byComercio) {
    if (txs.length < minHistoryCount) continue
    const typical = median(txs.map((t) => Math.abs(t.importe)))
    if (typical <= 0) continue
    for (const t of txs) {
      const amount = Math.abs(t.importe)
      if (amount >= typical * ratioThreshold) {
        flags.push({ transactionId: t.id, comercio, importeAbs: amount, typicalAbs: typical })
      }
    }
  }
  return flags
}
