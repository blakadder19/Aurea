import { isoDate } from '../../lib/budgetCalc'

export type NetWorthPeriod = 'Mes actual' | '3 meses' | 'Año' | 'Personalizado'

export interface NetWorthPoint {
  dateISO: string
  netWorth: number
}

interface TxLike {
  accountId: string
  dateISO: string
  amountCents: number
}

/** "2026-06-01" — primer día de `n` meses atrás desde `today` (n=0 → mes en curso). */
function monthsAgoStartIso(today: Date, monthsBack: number): string {
  return isoDate(new Date(today.getFullYear(), today.getMonth() - monthsBack, 1))
}

/** Fecha de inicio (ISO) del periodo elegido — "Personalizado" usa `customFromIso` o cae al mes en curso. */
export function periodStartIso(period: NetWorthPeriod, today: Date, customFromIso?: string): string {
  switch (period) {
    case 'Mes actual':
      return monthsAgoStartIso(today, 0)
    case '3 meses':
      return monthsAgoStartIso(today, 2)
    case 'Año':
      return isoDate(new Date(today.getFullYear(), 0, 1))
    case 'Personalizado':
      return customFromIso ?? monthsAgoStartIso(today, 0)
  }
}

function enumerateDatesIso(fromIso: string, toIso: string): string[] {
  const dates: string[] = []
  const [fy, fm, fd] = fromIso.split('-').map(Number)
  const [ty, tm, td] = toIso.split('-').map(Number)
  const cursor = new Date(fy, fm - 1, fd)
  const end = new Date(ty, tm - 1, td)
  while (cursor <= end) {
    dates.push(isoDate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

/**
 * Reconstruye el patrimonio neto en fechas pasadas a partir del patrimonio
 * de hoy y las transacciones desde entonces: patrimonio(fecha) = patrimonio
 * de hoy − Σ transacciones posteriores a esa fecha, ponderadas por el % de
 * titularidad de cada cuenta (igual que el patrimonio actual). Nunca
 * inventa datos anteriores al histórico real disponible: si
 * `earliestKnownDateIso` (el movimiento más antiguo que de verdad tenemos,
 * sin acotar a `fromDateIso`) es posterior a `fromDateIso`, la serie se
 * recorta para no dibujar una línea plana fabricada en el tramo sin datos
 * — mejor no mostrar esos días que fingir que el patrimonio no cambió.
 */
export function reconstructNetWorthSeries(
  currentNetWorth: number,
  transactions: TxLike[],
  shareByAccount: Map<string, number>,
  fromDateIso: string,
  toDateIso: string,
  earliestKnownDateIso?: string | null,
): NetWorthPoint[] {
  const effectiveFromIso = earliestKnownDateIso && earliestKnownDateIso > fromDateIso ? earliestKnownDateIso : fromDateIso
  const dates = enumerateDatesIso(effectiveFromIso, toDateIso)
  return dates.map((dateISO) => {
    const deltaCents = transactions
      .filter((tx) => tx.dateISO > dateISO)
      .reduce((sum, tx) => sum + tx.amountCents * ((shareByAccount.get(tx.accountId) ?? 100) / 100), 0)
    return { dateISO, netWorth: currentNetWorth - deltaCents / 100 }
  })
}
