/**
 * Detección de cargos recurrentes a partir del historial real de
 * movimientos. Sin tabla de "recurrentes": se recalcula cada vez a partir
 * de `transactions`, agrupando por cuenta + comercio y exigiendo un
 * espaciado mensual consistente (24-40 días entre cargos consecutivos) —
 * esto es lo que descarta comercios frecuentes pero no recurrentes (un
 * supermercado visitado cada pocos días no cuadra con ese espaciado).
 */

const MIN_GAP_DAYS = 24
const MAX_GAP_DAYS = 40
/** Duplicado: mismo importe exacto, cuentas distintas, cargado con pocos días de diferencia. */
const DUPLICATE_MAX_DAY_DIFF = 5

export interface RawCharge {
  accountId: string
  merchant: string
  dateISO: string
  amountCents: number
}

export interface DetectedOccurrence {
  dateISO: string
  amountCents: number
}

export interface DetectedGroup {
  /** `${accountId}::${normalizedMerchant}` — estable entre recargas. */
  dedupeKey: string
  accountId: string
  merchant: string
  /** Ascendente por fecha. */
  occurrences: DetectedOccurrence[]
  lastAmountCents: number
  prevAmountCents: number | null
  lastDateISO: string
  nextChargeDateISO: string
}

export interface DuplicateMatch {
  a: DetectedGroup
  b: DetectedGroup
  dayDiff: number
}

function normalizeMerchant(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ')
}

function daysBetween(aISO: string, bISO: string): number {
  const a = new Date(`${aISO}T00:00:00Z`).getTime()
  const b = new Date(`${bISO}T00:00:00Z`).getTime()
  return Math.round((b - a) / 86_400_000)
}

/** `addMonths` de un ISO date, sin depender de Date local (mismo criterio que goals/domain.ts). */
function addMonthsISO(dateISO: string, months: number): string {
  const [y, m, d] = dateISO.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1 + months, d))
  return date.toISOString().slice(0, 10)
}

/**
 * Agrupa cargos por cuenta+comercio y se queda solo con los grupos cuyo
 * espaciado entre TODOS los cargos consecutivos cae en [24, 40] días —
 * es decir, cadencia mensual consistente. Importes en 0 (retenciones/
 * autorizaciones pendientes en el sandbox bancario) se descartan.
 */
export function detectRecurringGroups(charges: RawCharge[]): DetectedGroup[] {
  const byKey = new Map<string, RawCharge[]>()
  for (const charge of charges) {
    if (charge.amountCents === 0) continue
    const key = `${charge.accountId}::${normalizeMerchant(charge.merchant)}`
    const bucket = byKey.get(key)
    if (bucket) bucket.push(charge)
    else byKey.set(key, [charge])
  }

  const groups: DetectedGroup[] = []
  for (const [key, bucket] of byKey) {
    if (bucket.length < 2) continue
    const sorted = [...bucket].sort((x, y) => x.dateISO.localeCompare(y.dateISO))

    let consistent = true
    for (let i = 1; i < sorted.length; i++) {
      const gap = daysBetween(sorted[i - 1].dateISO, sorted[i].dateISO)
      if (gap < MIN_GAP_DAYS || gap > MAX_GAP_DAYS) {
        consistent = false
        break
      }
    }
    if (!consistent) continue

    const last = sorted[sorted.length - 1]
    const prev = sorted.length >= 2 ? sorted[sorted.length - 2] : null

    groups.push({
      dedupeKey: key,
      accountId: last.accountId,
      merchant: sorted[0].merchant.trim(),
      occurrences: sorted.map((c) => ({ dateISO: c.dateISO, amountCents: c.amountCents })),
      lastAmountCents: Math.abs(last.amountCents),
      prevAmountCents: prev ? Math.abs(prev.amountCents) : null,
      lastDateISO: last.dateISO,
      nextChargeDateISO: addMonthsISO(last.dateISO, 1),
    })
  }

  return groups.sort((a, b) => a.merchant.localeCompare(b.merchant))
}

/** Solo se marca una subida de precio (una bajada no es una alerta). */
export function priceIncreaseCents(group: DetectedGroup): number | null {
  if (group.prevAmountCents === null) return null
  const diff = group.lastAmountCents - group.prevAmountCents
  return diff > 0 ? diff : null
}

/**
 * Pares de grupos DISTINTOS (cuentas distintas) con el mismo importe
 * exacto en su último cargo, cargados a pocos días el uno del otro.
 */
export function detectDuplicates(groups: DetectedGroup[]): DuplicateMatch[] {
  const matches: DuplicateMatch[] = []
  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      const a = groups[i]
      const b = groups[j]
      if (a.accountId === b.accountId) continue
      if (a.lastAmountCents !== b.lastAmountCents) continue
      const dayDiff = Math.abs(daysBetween(a.lastDateISO, b.lastDateISO))
      if (dayDiff <= DUPLICATE_MAX_DAY_DIFF) matches.push({ a, b, dayDiff })
    }
  }
  return matches
}

export interface MonthCell {
  day: number | null
  dedupeKeys: string[]
}

/**
 * Rejilla de un mes (lunes-domingo, como augustCalendarDays pero genérico):
 * qué grupos tienen `nextChargeDateISO` en ese día del mes indicado.
 */
export function monthCalendarDays(year: number, monthIndex0: number, groups: DetectedGroup[]): MonthCell[] {
  const daysInMonth = new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate()
  const firstWeekday = (new Date(Date.UTC(year, monthIndex0, 1)).getUTCDay() + 6) % 7 // lunes = 0

  const byDay = new Map<number, string[]>()
  for (const g of groups) {
    const [gy, gm, gd] = g.nextChargeDateISO.split('-').map(Number)
    if (gy === year && gm - 1 === monthIndex0) {
      const bucket = byDay.get(gd)
      if (bucket) bucket.push(g.dedupeKey)
      else byDay.set(gd, [g.dedupeKey])
    }
  }

  const cells: MonthCell[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push({ day: null, dedupeKeys: [] })
  for (let day = 1; day <= daysInMonth; day++) cells.push({ day, dedupeKeys: byDay.get(day) ?? [] })
  while (cells.length % 7 !== 0) cells.push({ day: null, dedupeKeys: [] })
  return cells
}
