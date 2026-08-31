/**
 * Etiqueta de cuenta para la tabla de movimientos. Motor puro, sin React
 * ni Supabase.
 *
 * Por qué existe: el banco devuelve el mismo titular para varias cuentas
 * (la de euros, la de libras, la de coronas...), así que las tres salían
 * en la tabla como "Alejandro López · Revolut" y era imposible saber a
 * cuál pertenecía cada movimiento.
 */

export interface AccountLabelSource {
  id: string
  /** Nombre a mostrar: el que haya puesto el usuario, o el del banco. */
  name: string
  institution: string
  /** ISO-4217; se usa solo para desempatar. */
  currency?: string | null
}

/**
 * Un nombre por cuenta, añadiendo la divisa SOLO donde hace falta para
 * distinguirlas. Añadirla siempre ensuciaría el caso normal (una sola
 * cuenta por banco), que es la mayoría.
 */
export function buildAccountLabels(accounts: AccountLabelSource[]): Map<string, string> {
  const base = (a: AccountLabelSource) => `${a.name} · ${a.institution}`

  const timesSeen = new Map<string, number>()
  for (const account of accounts) {
    const label = base(account)
    timesSeen.set(label, (timesSeen.get(label) ?? 0) + 1)
  }

  const labels = new Map<string, string>()
  for (const account of accounts) {
    const label = base(account)
    const collides = (timesSeen.get(label) ?? 0) > 1
    labels.set(account.id, collides && account.currency ? `${label} · ${account.currency}` : label)
  }
  return labels
}
