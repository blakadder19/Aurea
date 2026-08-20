/**
 * Lógica de dominio de objetivos, adaptada de la ya probada en
 * `blakadder19/Aurea---Finanzas@master` (`src/lib/selectors/goals.ts`):
 * mismo cálculo (progreso, meses restantes por división con redondeo hacia
 * arriba, fecha proyectada sumando meses con recorte de día), traducido de
 * céntimos enteros + fechas ISO a números en euros + `Date`, que es lo que
 * usa el resto de este proyecto.
 */

export interface GoalForecast {
  remaining: number
  /** 0–100, recortado: ningún objetivo cumplido pasa de la pista. */
  progressPct: number
  monthsToGoal: number
  projectedDate: Date | null
}

/** Suma `months` meses a `date`, recortando el día si el mes destino es más corto. */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + months)
  const lastDayOfTargetMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, lastDayOfTargetMonth))
  return d
}

export function goalForecast(saved: number, target: number, monthlyContribution: number, from: Date): GoalForecast {
  const remaining = Math.max(0, target - saved)
  const progressPct = target > 0 ? Math.min(100, (saved / target) * 100) : 0
  const monthsToGoal = monthlyContribution > 0 ? Math.ceil(remaining / monthlyContribution) : Infinity
  const projectedDate = Number.isFinite(monthsToGoal) ? addMonths(from, monthsToGoal) : null
  return { remaining, progressPct, monthsToGoal, projectedDate }
}

const MONTHS_LONG = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/** "marzo de 2027" */
export function formatMonthYear(date: Date): string {
  return `${MONTHS_LONG[date.getMonth()]} de ${date.getFullYear()}`
}

const MONTHS_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** "mar 2027" */
export function formatMonthYearShort(date: Date): string {
  return `${MONTHS_ABBR[date.getMonth()]} ${date.getFullYear()}`
}
