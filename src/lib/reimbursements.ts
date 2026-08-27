/**
 * Regla única de cómo cuenta cada movimiento hacia ingresos y gastos.
 * Vive aparte porque la aplican seis sitios distintos (Inicio, Presupuesto,
 * Informes, tendencia mensual, tendencia por categoría y Planificación) y
 * basta con que uno se desalinee para que las cifras dejen de cuadrar
 * entre pantallas.
 */

export interface AmountLike {
  amountCents: number
  /** Dinero tuyo cambiando de cuenta: ni gasto ni ingreso. */
  isInternalTransfer?: boolean
  /** Te devuelven parte de un gasto: resta del gasto, no suma como ingreso. */
  isReimbursement?: boolean
  /**
   * Saldo inicial de una cuenta manual o revalorización de un activo: mueve
   * tu patrimonio pero no es ni ingreso ni gasto. Que tu piso pase a valer
   * 10.000 € más no es que hayas ingresado 10.000 €.
   */
  isBalanceAdjustment?: boolean
}

/** true si el movimiento no cuenta ni como ingreso ni como gasto. */
function isNeutral(tx: AmountLike): boolean {
  return Boolean(tx.isInternalTransfer || tx.isBalanceAdjustment)
}

/** Lo que suma a ingresos (0 si no es un ingreso de verdad). */
export function incomeContribution(tx: AmountLike): number {
  if (isNeutral(tx)) return 0
  if (tx.isReimbursement) return 0
  return tx.amountCents > 0 ? tx.amountCents : 0
}

/**
 * Lo que suma a gastos, en positivo. Un reembolso resta (devuelve negativo),
 * porque el gasto real fue menor de lo que dice el cargo original.
 */
export function expenseContribution(tx: AmountLike): number {
  if (isNeutral(tx)) return 0
  if (tx.isReimbursement) return tx.amountCents > 0 ? -tx.amountCents : 0
  return tx.amountCents < 0 ? -tx.amountCents : 0
}

/**
 * true si el movimiento debe aparecer en el desglose por categoría (con el
 * signo que devuelve `expenseContribution`). Un ingreso normal no entra:
 * el desglose es de gasto.
 */
export function countsTowardCategorySpend(tx: AmountLike): boolean {
  if (isNeutral(tx)) return false
  return tx.isReimbursement ? tx.amountCents > 0 : tx.amountCents < 0
}
