/**
 * Cuánto costó en euros lo que gastaste desde un pocket en otra divisa —
 * motor puro, sin React ni Supabase.
 *
 * El problema: un pago de 193,60 zł desde el pocket de zlotys llega del banco
 * sin equivalente en euros, y con razón — en ese instante no hubo cambio
 * ninguno, Revolut solo restó zlotys que ya eran tuyos. El euro está en el
 * `EXCHANGE` que llenó el pocket, que puede ser de otro día y de otro importe.
 *
 * FIFO: los primeros céntimos que gastas son los primeros que cambiaste, cada
 * uno al cambio de SU lote. Sin medias. Un gasto puede partirse entre dos
 * lotes y llevarse dos tasas distintas, que es lo que de verdad pasó.
 *
 * Una cola por pocket, independientes. Como cada cuenta es exactamente una
 * divisa (la identidad de cuenta es uid + divisa), eso es una cola por divisa
 * y funciona igual con coronas o dólares sin tocar nada de aquí. Van por
 * cuenta y no por código de divisa para que dos pockets de la misma divisa
 * tampoco se mezclen entre sí.
 */

/** La divisa en la que se presupuesta. El único código de divisa que este módulo conoce. */
const REPORTING_CURRENCY = 'EUR'

export interface PocketMovement {
  id: string
  /** Un pocket. Cada uno lleva su propia cola y nunca se mezcla con otro. */
  accountId: string
  currency: string
  /** Firmado y en céntimos de `currency`: positivo entra en el pocket, negativo sale. */
  amountCents: number
  dateISO: string
  /** Solo en los movimientos que traen cambio de divisa; los demás, null. */
  exchangeRate: string | null
  exchangeRateUnitCurrency: string | null
}

export interface PocketSpendConversion {
  /** Por gasto: céntimos de EURO que FIFO ha podido respaldar. */
  eurCentsById: Map<string, number>
  /** Por gasto: lo que se queda sin respaldar, en céntimos de su propia divisa. */
  uncoveredCentsById: Map<string, number>
}

interface Lot {
  remainingCents: number
  /** Euros por céntimo de la divisa del pocket. null = entró sin cambio conocido detrás. */
  eurPerCent: number | null
}

/**
 * Lo que costó un céntimo del pocket, en euros.
 *
 * La tasa se cotiza con `unit_currency` como divisa base: 4,2894 con base EUR
 * son zlotys por euro, así que se divide. Si algún banco cotizara con otra
 * base, dividir daría un número plausible y equivocado — por eso, si la base
 * no es la divisa de referencia, el lote entra como desconocido y su gasto
 * acaba en "sin convertir" en vez de en una cifra inventada.
 */
function eurPerCent(movement: PocketMovement): number | null {
  if (!movement.exchangeRate) return null
  if (movement.exchangeRateUnitCurrency !== REPORTING_CURRENCY) return null
  const rate = Number(movement.exchangeRate)
  if (!Number.isFinite(rate) || rate <= 0) return null
  return 1 / rate
}

/**
 * Orden de consumo. El banco no da hora, solo `booking_date`, así que dentro
 * del mismo día hay que elegir: primero lo que entra.
 *
 * No es una preferencia, lo decide el dato. Con los abonos primero, el resto
 * del pocket de zlotys cuadra al céntimo con el saldo del banco (2,54 zł el
 * 18 ago 2026). Al revés sobran 704,12 zł y cinco gastos se quedan sin
 * cubrir, lo que es imposible: si el pocket no cubre un pago, Revolut lo
 * carga a la cuenta en euros y ese pago nunca aparece en el pocket.
 */
function sortForFifo(movements: PocketMovement[]): PocketMovement[] {
  return [...movements].sort((a, b) => {
    if (a.dateISO !== b.dateISO) return a.dateISO < b.dateISO ? -1 : 1
    return Math.sign(b.amountCents) - Math.sign(a.amountCents)
  })
}

/**
 * Reparte cada gasto contra los lotes que lo respaldan, pocket a pocket.
 *
 * El llamador pasa solo movimientos de pockets (divisa distinta a la de
 * referencia); los que ya están en euros no necesitan conversión y no pintan
 * nada aquí.
 */
export function convertPocketSpendFifo(movements: PocketMovement[]): PocketSpendConversion {
  const eurCentsById = new Map<string, number>()
  const uncoveredCentsById = new Map<string, number>()

  const byPocket = new Map<string, PocketMovement[]>()
  for (const m of movements) {
    byPocket.set(m.accountId, [...(byPocket.get(m.accountId) ?? []), m])
  }

  for (const pocket of byPocket.values()) {
    const lots: Lot[] = []
    for (const movement of sortForFifo(pocket)) {
      if (movement.amountCents > 0) {
        lots.push({ remainingCents: movement.amountCents, eurPerCent: eurPerCent(movement) })
        continue
      }

      let pending = -movement.amountCents
      let eur = 0
      let uncovered = 0
      while (pending > 0) {
        const lot = lots[0]
        // Sin lote que lo respalde: el pocket tenía saldo de antes de que
        // existieran nuestros datos. No se inventa una tasa.
        if (!lot) {
          uncovered += pending
          break
        }
        const used = Math.min(lot.remainingCents, pending)
        if (lot.eurPerCent === null) uncovered += used
        else eur += used * lot.eurPerCent
        lot.remainingCents -= used
        pending -= used
        if (lot.remainingCents === 0) lots.shift()
      }

      // Se redondea una vez por gasto, no por trozo: partir un pago entre dos
      // lotes no debe costarle un céntimo de más.
      if (eur > 0) eurCentsById.set(movement.id, Math.round(eur))
      if (uncovered > 0) uncoveredCentsById.set(movement.id, uncovered)
    }
  }

  return { eurCentsById, uncoveredCentsById }
}
