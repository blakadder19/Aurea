import { countsTowardCategorySpend, expenseContribution } from './reimbursements'

/** Lo mínimo que hace falta de un movimiento para sumarlo. */
export interface TagSummaryInput {
  id: string
  categoria: string
  importe: number
  currency?: string
  dateISO?: string | null
  isInternalTransfer?: boolean
  isReimbursement?: boolean
  isBalanceAdjustment?: boolean
}

export interface TagCategorySpend {
  categoria: string
  cents: number
  /** 0–100 sobre el total, para la barra. */
  share: number
}

export interface TagSummary {
  totalCents: number
  movementCount: number
  fromISO: string | null
  toISO: string | null
  byCategory: TagCategorySpend[]
  /** Gasto en otra divisa que FIFO no pudo respaldar, en céntimos de su divisa. */
  uncovered: { currency: string; cents: number }[]
}

const REPORTING_CURRENCY = 'EUR'

/**
 * Cuánto costó lo que lleva una etiqueta, y en qué se fue — motor puro.
 *
 * Suma en euros, no en "números": un viaje puede mezclar pagos en euros con
 * gasto desde un pocket en otra divisa, y sumarlos a pelo daría una cifra sin
 * significado. Lo del pocket se convierte con el mismo FIFO que ya usa
 * Presupuesto, y lo que no se puede respaldar se reporta aparte en vez de
 * colarse en el total.
 *
 * Mismas reglas de gasto que el resto de la app (`reimbursements`): un
 * traspaso entre cuentas propias no cuenta y un reembolso resta.
 */
export function buildTagSummary(
  transactions: TagSummaryInput[],
  eurCentsById: Map<string, number>,
  uncoveredCentsById: Map<string, number>,
): TagSummary {
  const byCategory = new Map<string, number>()
  const uncovered = new Map<string, number>()
  let totalCents = 0
  let movementCount = 0
  let fromISO: string | null = null
  let toISO: string | null = null

  for (const t of transactions) {
    const rawCents = Math.round(t.importe * 100)
    const flags = {
      isInternalTransfer: t.isInternalTransfer,
      isReimbursement: t.isReimbursement,
      isBalanceAdjustment: t.isBalanceAdjustment,
    }
    // El signo lo decide el movimiento original: FIFO solo da magnitud.
    const enEuros = (t.currency ?? REPORTING_CURRENCY) === REPORTING_CURRENCY
    const cents = enEuros ? rawCents : Math.sign(rawCents) * (eurCentsById.get(t.id) ?? 0)

    if (!enEuros) {
      const sinRespaldo = uncoveredCentsById.get(t.id) ?? 0
      if (sinRespaldo > 0) {
        const divisa = t.currency ?? '?'
        uncovered.set(divisa, (uncovered.get(divisa) ?? 0) + sinRespaldo)
      }
    }

    // Se decide con la cifra original: un gasto que convierte a 0 € por no
    // tener respaldo sigue siendo un gasto, no deja de serlo.
    if (!countsTowardCategorySpend({ ...flags, amountCents: rawCents })) continue

    movementCount += 1
    if (t.dateISO) {
      if (!fromISO || t.dateISO < fromISO) fromISO = t.dateISO
      if (!toISO || t.dateISO > toISO) toISO = t.dateISO
    }

    const aporta = expenseContribution({ ...flags, amountCents: cents })
    totalCents += aporta
    byCategory.set(t.categoria, (byCategory.get(t.categoria) ?? 0) + aporta)
  }

  return {
    totalCents,
    movementCount,
    fromISO,
    toISO,
    byCategory: [...byCategory.entries()]
      .map(([categoria, cents]) => ({ categoria, cents, share: totalCents > 0 ? (cents / totalCents) * 100 : 0 }))
      .sort((a, b) => b.cents - a.cents),
    uncovered: [...uncovered.entries()].map(([currency, cents]) => ({ currency, cents })).filter((u) => u.cents > 0),
  }
}
