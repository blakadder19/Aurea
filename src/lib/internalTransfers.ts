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

  const scored: (TransferCandidate & { dayGap: number })[] = []
  for (const out of outgoing) {
    for (const inc of incoming) {
      if (inc.amountCents !== -out.amountCents) continue
      if (inc.accountId === out.accountId) continue
      const dayGap = daysBetween(out.dateISO, inc.dateISO)
      if (dayGap > MAX_DAY_GAP) continue
      scored.push({ outgoing: out, incoming: inc, confidence: confidenceFor(out, inc, tokens), dayGap })
    }
  }

  scored.sort((a, b) => {
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
