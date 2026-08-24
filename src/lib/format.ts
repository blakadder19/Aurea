const MINUS = '−'

const MONTHS_ABBR = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
] as const

const WEEKDAYS = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado',
] as const

function formatAmount(value: number, decimals: number): string {
  return Math.abs(value).toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    // 'auto' (el valor por defecto de Intl) omite el separador de miles en
    // números de 4 cifras (regla CLDR "min2"). El README exige "5.383,24 €".
    useGrouping: 'always',
  })
}

const CURRENCY_SYMBOLS: Record<string, string> = { EUR: '€', GBP: '£', USD: '$' }

/** Símbolo si lo conocemos (€, £, $); si no, el código ISO tal cual (p. ej. "SEK", "PLN"). */
function currencySuffix(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? currency
}

/** "5.383,24 €" · negativos con signo − explícito, nunca paréntesis. `currency`: código ISO, EUR por defecto. */
export function formatMoney(value: number, decimals = 2, currency = 'EUR'): string {
  const sign = value < 0 ? MINUS : ''
  return `${sign}${formatAmount(value, decimals)} ${currencySuffix(currency)}`
}

/** "+5.383,24 €" · fuerza el signo también en positivos (para deltas) */
export function formatMoneySigned(value: number, decimals = 2, currency = 'EUR'): string {
  const sign = value < 0 ? MINUS : '+'
  return `${sign}${formatAmount(value, decimals)} ${currencySuffix(currency)}`
}

/** "+0,7 %" / "−0,7 %" */
export function formatPercentSigned(value: number): string {
  const sign = value < 0 ? MINUS : '+'
  const amount = Math.abs(value).toLocaleString('es-ES', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  return `${sign}${amount} %`
}

/** "19 ago" */
export function formatDayMonth(day: number, monthIndex0: number): string {
  return `${day} ${MONTHS_ABBR[monthIndex0]}`
}

/** "19 ago 2026" */
export function formatDayMonthYear(day: number, monthIndex0: number, year: number): string {
  return `${formatDayMonth(day, monthIndex0)} ${year}`
}

/** "Miércoles 19 ago 2026" */
export function formatWeekdayDate(date: Date): string {
  const weekday = WEEKDAYS[date.getDay()]
  return `${weekday} ${formatDayMonthYear(date.getDate(), date.getMonth(), date.getFullYear())}`
}

/** "agosto de 2026" */
export function formatMonthYearLong(monthIndex0: number, year: number): string {
  const MONTHS_LONG = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ]
  return `${MONTHS_LONG[monthIndex0]} de ${year}`
}

export { MONTHS_ABBR }
