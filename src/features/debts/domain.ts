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
