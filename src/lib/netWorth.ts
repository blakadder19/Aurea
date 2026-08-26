/**
 * Reparto activos/pasivos a partir de cuentas reales — mismo criterio en
 * Cuentas y patrimonio, Inicio y Planificación (antes copiado en los tres,
 * con el riesgo de arreglar un matiz en uno y olvidarlo en los demás).
 */

interface AccountLike {
  balance: number
  /** % del saldo que cuenta como patrimonio propio (cuentas compartidas) — 100 si no se indica. */
  sharePercent?: number
}

export function accountShareValue(a: AccountLike): number {
  return a.balance * ((a.sharePercent ?? 100) / 100)
}

export function computeAssetsLiabilities(accounts: AccountLike[]): { assets: number; liabilities: number } {
  let assets = 0
  let liabilities = 0
  for (const a of accounts) {
    const value = accountShareValue(a)
    if (value >= 0) assets += value
    else liabilities += -value
  }
  return { assets, liabilities }
}
