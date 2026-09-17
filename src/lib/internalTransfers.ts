/**
 * Detección de traspasos entre cuentas propias — motor puro, sin React ni
 * Supabase.
 *
 * Por qué esto NUNCA se aplica solo: sobre datos reales, "mismo importe +
 * cuentas distintas + pocos días" también encaja con un reembolso de un
 * tercero (una cena de 12 € que te devuelve un amigo al día siguiente).
 * Marcar eso como traspaso interno borraría un gasto de verdad. Así que
 * esto solo propone parejas; confirmarlas es del usuario.
 */

export interface TransferTxLike {
  id: string
  accountId: string
  dateISO: string
  amountCents: number
  description: string
  /** Divisa del propio movimiento, no la de la cuenta. Sin esto se emparejaban 200 PLN con 200 EUR. */
  currency: string
  /** `bank_transaction_code.code` del banco: EXCHANGE, TRANSFER, CARD_PAYMENT… null en lo sincronizado antes del 17 sep 2026. */
  transactionCode: string | null
  /** Tasa exacta del cambio, como string para compararla sin perder cifras. Solo viene en un cambio de divisa. */
  exchangeRate: string | null
  /** Importe instruido en céntimos (el de antes del margen), cuando el banco lo manda. */
  instructedAmountCents: number | null
}

export interface TransferCandidate {
  /** El movimiento negativo de la pareja. */
  outgoing: TransferTxLike
  /** El movimiento positivo del mismo importe. */
  incoming: TransferTxLike
  /**
   * 'alta' cuando el texto corrobora que es dinero tuyo moviéndose (misma
   * descripción en ambos lados, o una descripción que nombra a una de tus
   * cuentas). 'media' cuando solo cuadran importe y fecha — ahí es donde
   * caben los reembolsos de terceros, y por eso hace falta confirmar.
   */
  confidence: 'alta' | 'media'
}

/** Ventana en días: un traspaso entre bancos puede tardar un par de días en aparecer en el otro lado. */
const MAX_DAY_GAP = 3

/**
 * Margen al comprobar que las dos patas de un cambio cuadran con la tasa.
 * Usando el importe instruido el error real es menor del 0,05%; el 2% deja
 * sitio a que una pata no traiga instruido y haya que usar el cobrado, que
 * lleva el margen de Revolut encima (~1%, 2% en fin de semana).
 */
const EXCHANGE_TOLERANCE = 0.02

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Los bancos truncan nombres ("From Alejandro L" para la cuenta "Alejandro
 * López"), así que se compara por palabras sueltas y no por el nombre
 * entero. Palabras de 4+ letras para no colar coincidencias tontas.
 */
function ownAccountTokens(ownAccountNames: string[]): string[] {
  return [...new Set(ownAccountNames.flatMap((name) => normalize(name).split(' ')).filter((token) => token.length >= 4))]
}

function mentionsOwnAccount(description: string, tokens: string[]): boolean {
  const text = normalize(description)
  return tokens.some((token) => text.includes(token))
}

function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(`${aIso}T00:00:00`)
  const b = new Date(`${bIso}T00:00:00`)
  return Math.abs(Math.round((a.getTime() - b.getTime()) / 86_400_000))
}

/**
 * 'alta' si el texto respalda que es dinero tuyo: misma descripción a ambos
 * lados (típico de un cambio de divisa), o AMBOS lados nombran una cuenta
 * tuya. Exigir los dos lados importa: en un reembolso, el cargo puede
 * nombrarte a ti igualmente ("To <tu cuenta conjunta>") mientras que quien
 * devuelve el dinero es un tercero.
 */
function confidenceFor(outgoing: TransferTxLike, incoming: TransferTxLike, tokens: string[]): 'alta' | 'media' {
  const out = normalize(outgoing.description)
  const inc = normalize(incoming.description)
  if (out && out === inc) return 'alta'
  return mentionsOwnAccount(out, tokens) && mentionsOwnAccount(inc, tokens) ? 'alta' : 'media'
}

/** El importe más fiel para cuadrar un cambio: el instruido si viene (sin margen), si no el cobrado. */
function magnitudeCents(tx: TransferTxLike): number {
  return Math.abs(tx.instructedAmountCents ?? tx.amountCents)
}

function converts(base: number, quote: number, rate: number): boolean {
  return Math.abs(base * rate - quote) <= quote * EXCHANGE_TOLERANCE
}

/**
 * Las dos patas de un mismo cambio de divisa, según lo que dice el banco y no
 * según el importe: ambas `EXCHANGE`, misma tasa exacta, dos divisas
 * distintas, y los importes cuadran al aplicar la tasa.
 *
 * Cuadrar hace falta ADEMÁS de compartir tasa, porque Revolut reutiliza la
 * misma tasa en varios cambios seguidos: el 15 y el 16 de agosto hubo cuatro
 * patas con la tasa 4.2894237149666891, y son dos parejas, no una.
 *
 * No se mira cuál es la divisa base de la cotización: se prueban las dos
 * direcciones. Con tasas lejos de 1 solo cuadra una, y con tasas cercanas a 1
 * cuadran las dos pero la pareja es la misma.
 */
function isExchangePair(a: TransferTxLike, b: TransferTxLike): boolean {
  if (a.transactionCode !== 'EXCHANGE' || b.transactionCode !== 'EXCHANGE') return false
  if (!a.exchangeRate || a.exchangeRate !== b.exchangeRate) return false
  if (a.currency === b.currency) return false
  const rate = Number(a.exchangeRate)
  if (!Number.isFinite(rate) || rate <= 0) return false
  const magA = magnitudeCents(a)
  const magB = magnitudeCents(b)
  return converts(magA, magB, rate) || converts(magB, magA, rate)
}

/** Ambas patas marcadas por el banco con el mismo código: la pareja no se está adivinando. */
function bankBacked(out: TransferTxLike, inc: TransferTxLike): boolean {
  return (
    (out.transactionCode === 'EXCHANGE' && inc.transactionCode === 'EXCHANGE') ||
    (out.transactionCode === 'TRANSFER' && inc.transactionCode === 'TRANSFER')
  )
}

/**
 * Confianza de la pareja, o null si no son pareja.
 *
 * Manda el banco. `bank_transaction_code.code` dice si un movimiento es un
 * cambio de divisa o un traspaso, y desde el 17 sep 2026 está guardado. Antes
 * esto solo comparaba `amountCents` a secas, sin mirar la divisa, y por eso
 * llegó a emparejar −200 EUR con +200 PLN.
 *
 * Un cambio de divisa NUNCA tiene el mismo importe a los dos lados, así que
 * es el código y la tasa lo que lo identifica, no la cifra.
 */
function pairConfidence(out: TransferTxLike, inc: TransferTxLike, tokens: string[]): 'alta' | 'media' | null {
  if (isExchangePair(out, inc)) return 'alta'
  // Divisas distintas sin un cambio del banco detrás: los importes no son
  // comparables, no hay nada que emparejar.
  if (out.currency !== inc.currency) return null
  if (inc.amountCents !== -out.amountCents) return null
  if (out.transactionCode === 'TRANSFER' && inc.transactionCode === 'TRANSFER') return 'alta'
  return confidenceFor(out, inc, tokens)
}

/**
 * Parejas +X/−X entre cuentas distintas dentro de la ventana de días. Cada
 * movimiento entra como mucho en una pareja: se reparten primero las de más
 * confianza y menos días de diferencia, para que una coincidencia floja no
 * se lleve un movimiento que encajaba mejor en otra pareja.
 */
export function detectInternalTransferCandidates(
  transactions: TransferTxLike[],
  ownAccountNames: string[] = [],
): TransferCandidate[] {
  const outgoing = transactions.filter((t) => t.amountCents < 0)
  const incoming = transactions.filter((t) => t.amountCents > 0)
  const tokens = ownAccountTokens(ownAccountNames)

  const scored: (TransferCandidate & { dayGap: number; fromBank: boolean })[] = []
  for (const out of outgoing) {
    for (const inc of incoming) {
      if (inc.accountId === out.accountId) continue
      const dayGap = daysBetween(out.dateISO, inc.dateISO)
      if (dayGap > MAX_DAY_GAP) continue
      const confidence = pairConfidence(out, inc, tokens)
      if (!confidence) continue
      scored.push({ outgoing: out, incoming: inc, confidence, dayGap, fromBank: bankBacked(out, inc) })
    }
  }

  scored.sort((a, b) => {
    // Lo que dice el banco va primero: una pareja confirmada por código y tasa
    // no debe perder un lado contra una coincidencia de texto.
    if (a.fromBank !== b.fromBank) return a.fromBank ? -1 : 1
    if (a.confidence !== b.confidence) return a.confidence === 'alta' ? -1 : 1
    return a.dayGap - b.dayGap
  })

  const used = new Set<string>()
  const result: TransferCandidate[] = []
  for (const candidate of scored) {
    if (used.has(candidate.outgoing.id) || used.has(candidate.incoming.id)) continue
    used.add(candidate.outgoing.id)
    used.add(candidate.incoming.id)
    result.push({ outgoing: candidate.outgoing, incoming: candidate.incoming, confidence: candidate.confidence })
  }
  return result
}
