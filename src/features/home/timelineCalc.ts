import type { TimelineEvent, TimelineTier } from '../../data/demo'
import type { DetectedGroup } from '../../lib/recurringCalc'

const MONTHS_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function addDaysISO(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d + days))
  return date.toISOString().slice(0, 10)
}

function todayISO(today: Date): string {
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

/** "19" si cae en el mes de hoy, "1 sep" si cae en el mes siguiente. */
function dayLabel(dateISO: string, todayMonthIndex0: number): string {
  const [, m, d] = dateISO.split('-').map(Number)
  const day = String(Number(d))
  return m - 1 === todayMonthIndex0 ? day : `${day} ${MONTHS_ABBR[m - 1]}`
}

export interface RealTimeline {
  days: string[]
  events: TimelineEvent[]
  totalOut: number
  rangeLabel: string
}

/**
 * Construye la línea de 15 días (hoy + 14) a partir de los cargos
 * recurrentes reales detectados cuyo próximo cargo cae en la ventana. Sin
 * ingreso: no hay detección real de nóminas/ingresos recurrentes (ver
 * recurringCalc.ts, que solo mira gasto DBIT).
 */
export function buildRealTimeline(today: Date, groups: DetectedGroup[]): RealTimeline {
  const start = todayISO(today)
  const end = addDaysISO(start, 14)

  const days: string[] = []
  for (let offset = 0; offset <= 14; offset++) days.push(dayLabel(addDaysISO(start, offset), today.getMonth()))

  const byDay = new Map<number, { name: string; amountCents: number }[]>()
  for (const g of groups) {
    if (g.nextChargeDateISO < start || g.nextChargeDateISO > end) continue
    const offset = Math.round((new Date(`${g.nextChargeDateISO}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime()) / 86_400_000)
    const bucket = byDay.get(offset) ?? []
    bucket.push({ name: g.merchant, amountCents: g.lastAmountCents })
    byDay.set(offset, bucket)
  }

  const events: TimelineEvent[] = [{ day: days[0], column: 1, label: 'Hoy', amount: 0, tier: 'today' }]
  let totalOutCents = 0
  let paymentCount = 0
  const sortedOffsets = [...byDay.keys()].sort((a, b) => a - b)
  sortedOffsets.forEach((offset, i) => {
    const items = byDay.get(offset)!
    const amountCents = items.reduce((sum, it) => sum + it.amountCents, 0)
    totalOutCents += amountCents
    paymentCount += items.length
    const tier: TimelineTier = i % 2 === 0 ? 'lower' : 'upper'
    events.push({
      day: days[offset],
      column: offset + 1,
      label: items.map((it) => it.name).join(' · '),
      amount: -(amountCents / 100),
      tier,
      align: offset === 14 ? 'right' : undefined,
    })
  })

  const rangeLabel =
    paymentCount === 0
      ? `Del ${days[0]} al ${days[14]} · sin cargos recurrentes detectados`
      : `Del ${days[0]} al ${days[14]} · ${paymentCount} pago${paymentCount === 1 ? '' : 's'}`

  return { days, events, totalOut: totalOutCents / 100, rangeLabel }
}
