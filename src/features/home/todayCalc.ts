/**
 * El titular de Inicio: una frase en castellano que responda "¿cómo voy?"
 * antes que cualquier cifra. Motor puro, sin React ni Supabase.
 *
 * Por qué existe: la pantalla abría con "Disponible hoy −785,06 €". Es un
 * dato correcto, pero no dice nada por sí solo — ni si eso es malo, ni de
 * dónde sale, ni qué hacer. Aquí se traduce a lenguaje llano.
 */

import { formatMoney } from '../../lib/format'

export type MonthTone = 'holgado' | 'justo' | 'apretado' | 'sin-datos'

export interface TodayHeadline {
  tone: MonthTone
  /** Frase corta y rotunda: lo primero que se lee. */
  headline: string
  /** Una línea explicando de dónde sale, con las cifras reales. */
  detail: string
}

export interface TodayInput {
  /** Saldo de las cuentas "para gastar" menos los pagos comprometidos de los próximos 14 días. */
  availableToday: number
  /** Suma de las cuentas que cuentan para gastar. */
  eligibleAccountsSum: number
  /** Pagos ya detectados que salen en los próximos 14 días. */
  commitments14d: number
  /** Gastado en lo que va de mes. */
  monthExpense: number
}

/** Mismo formateador que el resto de la app, para que no haya dos maneras de escribir un importe. */
const euros = (value: number) => formatMoney(value, 0)

/**
 * El tono sale de comparar el margen con lo que ya está comprometido, no
 * de un umbral en euros: 200 € de margen es holgado si te salen 300 al mes
 * y agónico si te salen 3.000.
 */
export function buildTodayHeadline(input: TodayInput): TodayHeadline {
  const { availableToday, eligibleAccountsSum, commitments14d, monthExpense } = input

  if (eligibleAccountsSum === 0 && commitments14d === 0) {
    return {
      tone: 'sin-datos',
      headline: 'Todavía no hay suficiente para decirte cómo vas',
      detail: 'Conecta un banco o asigna función a tus cuentas y aquí verás tu margen real.',
    }
  }

  if (availableToday < 0) {
    return {
      tone: 'apretado',
      headline: 'Este mes vas apretado',
      detail: `Te faltan ${euros(Math.abs(availableToday))} para cubrir los ${euros(commitments14d)} que salen en las próximas dos semanas, contando solo tus cuentas para gastar.`,
    }
  }

  // Menos de un 15 % de colchón sobre lo comprometido es ir con lo justo.
  const cushionRatio = commitments14d > 0 ? availableToday / commitments14d : Number.POSITIVE_INFINITY
  if (cushionRatio < 0.15) {
    return {
      tone: 'justo',
      headline: 'Vas justo, pero llegas',
      detail: `Te quedan ${euros(availableToday)} libres después de cubrir los ${euros(commitments14d)} de las próximas dos semanas.`,
    }
  }

  return {
    tone: 'holgado',
    headline: 'Vas bien este mes',
    detail: `Te quedan ${euros(availableToday)} libres tras cubrir los pagos de las próximas dos semanas. Llevas ${euros(monthExpense)} gastados.`,
  }
}
