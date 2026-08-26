/**
 * Amortización de préstamos a cuota fija. Dado el saldo, tipo anual y cuota
 * mensual actuales, calcula los meses restantes hasta liquidar la deuda —
 * sin necesitar la fecha de origen ni el plazo pactado, que no tenemos.
 * Se usa tanto para "Fin previsto" en la tabla como para el simulador de
 * pago extraordinario (una pura reducción de principal recalcula los meses).
 */

/** Meses hasta saldo 0, o Infinity si la cuota no llega a cubrir los intereses. */
export function monthsToPayoff(balance: number, annualRate: number, monthlyPayment: number): number {
  if (balance <= 0) return 0
  const i = annualRate / 12
  if (i === 0) return balance / monthlyPayment
  const ratio = 1 - (balance * i) / monthlyPayment
  if (ratio <= 0) return Infinity
  return -Math.log(ratio) / Math.log(1 + i)
}

export interface ExtraPaymentResult {
  monthsBefore: number
  monthsAfter: number
  monthsSaved: number
  interestSaved: number
  newPayoffDate: Date | null
}

export function simulateExtraPayment(
  balance: number,
  annualRate: number,
  monthlyPayment: number,
  extra: number,
  from: Date,
): ExtraPaymentResult {
  const monthsBefore = monthsToPayoff(balance, annualRate, monthlyPayment)
  const monthsAfter = monthsToPayoff(Math.max(0, balance - extra), annualRate, monthlyPayment)
  const monthsSaved = Number.isFinite(monthsBefore) ? monthsBefore - monthsAfter : 0
  const interestSaved = Number.isFinite(monthsBefore) ? monthlyPayment * monthsSaved - extra : 0
  const newPayoffDate = Number.isFinite(monthsAfter) ? addMonths(from, monthsAfter) : null
  return { monthsBefore, monthsAfter, monthsSaved, interestSaved, newPayoffDate }
}

export interface StrategyDebtInput {
  id: string
  name: string
  balanceCents: number
  annualRateBps: number
  monthlyPaymentCents: number
}

export interface StrategyResult {
  order: string[]
  totalMonths: number
  totalInterestCents: number
}

/**
 * Simula mes a mes el pago de varias deudas a la vez: cada una recibe su
 * cuota mínima, y en cuanto una se liquida, su cuota se redirige entera a
 * la siguiente deuda activa según el orden de la estrategia — el efecto
 * "bola de nieve" de verdad, no solo months-to-payoff de cada una por
 * separado. Tope de 50 años para no colgarse si una cuota no llega a
 * cubrir ni los intereses.
 */
function simulateStrategy(debts: StrategyDebtInput[], order: string[]): { totalMonths: number; totalInterestCents: number } {
  const balance = new Map(debts.map((d) => [d.id, d.balanceCents]))
  const minPayment = new Map(debts.map((d) => [d.id, d.monthlyPaymentCents]))
  const rate = new Map(debts.map((d) => [d.id, d.annualRateBps]))
  const MAX_MONTHS = 600
  let months = 0
  let totalInterestCents = 0

  while ([...balance.values()].some((b) => b > 0) && months < MAX_MONTHS) {
    months++
    for (const id of balance.keys()) {
      const bal = balance.get(id)!
      if (bal <= 0) continue
      const interest = Math.round((bal * (rate.get(id)! / 10000)) / 12)
      totalInterestCents += interest
      balance.set(id, bal + interest)
    }
    let freedCents = 0
    for (const id of balance.keys()) {
      if (balance.get(id)! <= 0) freedCents += minPayment.get(id)!
    }
    for (const id of balance.keys()) {
      const bal = balance.get(id)!
      if (bal <= 0) continue
      balance.set(id, bal - Math.min(minPayment.get(id)!, bal))
    }
    for (const id of order) {
      if (freedCents <= 0) break
      const bal = balance.get(id)!
      if (bal <= 0) continue
      const pay = Math.min(freedCents, bal)
      balance.set(id, bal - pay)
      freedCents -= pay
    }
  }
  return { totalMonths: months, totalInterestCents }
}

/** Avalancha: tipo de interés más alto primero (menos intereses totales). */
export function avalancheOrder(debts: StrategyDebtInput[]): StrategyDebtInput[] {
  return [...debts].sort((a, b) => b.annualRateBps - a.annualRateBps)
}

/** Bola de nieve: saldo más pequeño primero (victorias rápidas, motivación). */
export function snowballOrder(debts: StrategyDebtInput[]): StrategyDebtInput[] {
  return [...debts].sort((a, b) => a.balanceCents - b.balanceCents)
}

export function compareDebtStrategies(debts: StrategyDebtInput[]): { avalanche: StrategyResult; snowball: StrategyResult } {
  const avalanche = avalancheOrder(debts)
  const snowball = snowballOrder(debts)
  return {
    avalanche: { order: avalanche.map((d) => d.name), ...simulateStrategy(debts, avalanche.map((d) => d.id)) },
    snowball: { order: snowball.map((d) => d.name), ...simulateStrategy(debts, snowball.map((d) => d.id)) },
  }
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + Math.round(months))
  const lastDayOfTargetMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, lastDayOfTargetMonth))
  return d
}

const MONTHS_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** "sep 2056" */
export function formatMonthYearShort(date: Date): string {
  return `${MONTHS_ABBR[date.getMonth()]} ${date.getFullYear()}`
}

/** "30 años y 1 mes" a partir de meses totales. */
export function formatDuration(months: number): string {
  if (!Number.isFinite(months)) return 'indefinido'
  const totalMonths = Math.round(months)
  const years = Math.floor(totalMonths / 12)
  const rest = totalMonths % 12
  const yearsPart = years > 0 ? `${years} ${years === 1 ? 'año' : 'años'}` : ''
  const monthsPart = rest > 0 ? `${rest} ${rest === 1 ? 'mes' : 'meses'}` : ''
  return [yearsPart, monthsPart].filter(Boolean).join(' y ') || '0 meses'
}
