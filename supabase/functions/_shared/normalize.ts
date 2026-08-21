import { createHash } from 'node:crypto'

/**
 * Normalización de formas de Enable Banking → forma interna.
 * Portado de blakadder19/Aurea---Finanzas (server/normalize.ts) sin cambios
 * de lógica: cifras siempre en céntimos enteros, IBAN siempre enmascarado,
 * huella de deduplicación determinista.
 */

export interface EbAmount {
  currency: string
  amount: string
}

export interface EbBalance {
  name?: string
  balance_amount: EbAmount
  balance_type?: string
  reference_date?: string
  last_change_date_time?: string
}

export interface EbTransaction {
  entry_reference?: string
  transaction_amount: EbAmount
  credit_debit_indicator?: string
  status?: string
  booking_date?: string
  value_date?: string
  transaction_date?: string
  reference_number?: string
  remittance_information?: string[]
}

export interface EbAccountDetails {
  uid?: string
  identification_hash?: string
  account_id?: { iban?: string; other?: { identification?: string } }
  name?: string
  product?: string
  currency?: string
  cash_account_type?: string
}

/** Decimal string → céntimos enteros (evita coma flotante). Redondeo half-up al 3er decimal. */
export function decimalToCents(decimal: string): number {
  const match = /^(-)?(\d+)(?:\.(\d+))?$/.exec(decimal.trim())
  if (!match) return 0
  const [, sign, intPart, fracPart = ''] = match
  const paddedFrac = (fracPart + '000').slice(0, 3)
  const roundingDigit = Number(paddedFrac[2])
  let cents = Number(intPart) * 100 + Number(paddedFrac.slice(0, 2))
  if (roundingDigit >= 5) cents += 1
  return sign ? -cents : cents
}

/** Siempre toma el valor absoluto primero, luego aplica el signo por CRDT/DBIT (evita doble negación). */
export function signedAmountCents(amount: EbAmount, creditDebitIndicator?: string): number {
  const magnitude = Math.abs(decimalToCents(amount.amount))
  return creditDebitIndicator === 'DBIT' ? -magnitude : magnitude
}

const BALANCE_PRIORITY = [
  'CLBD', 'ITBD', 'ITAV', 'XPCD', 'PRCD', 'CLAV', 'OPBD', 'OPAV', 'FWAV', 'VALU', 'OTHR',
]

export function pickPrincipalBalance(balances: EbBalance[]): EbBalance | null {
  if (balances.length === 0) return null
  for (const type of BALANCE_PRIORITY) {
    const match = balances.find((b) => b.balance_type === type)
    if (match) return match
  }
  return balances[0]
}

/** Identidad = uid (o hash de identificación) + divisa — NUNCA por IBAN (Revolut comparte IBAN entre divisas). */
export function accountKey(details: EbAccountDetails, currency: string): string {
  return `${details.uid || details.identification_hash || 'unknown'}:${currency.toUpperCase()}`
}

/** IBAN enmascarado: país + últimos 4 dígitos; el resto, oculto. Nunca se persiste el IBAN completo. */
export function maskIban(iban: string | undefined | null): string | null {
  if (!iban) return null
  const clean = iban.replace(/\s+/g, '').toUpperCase()
  if (clean.length < 6) return '••••••'
  return `${clean.slice(0, 2)}••••••${clean.slice(-4)}`
}

/** Huella de deduplicación: preferentemente el `entry_reference` estable; si no, hash determinista. */
export function transactionFingerprint(accKey: string, tx: EbTransaction): string {
  if (tx.entry_reference) return `id:${accKey}:${tx.entry_reference}`
  const date = tx.booking_date || tx.value_date || tx.transaction_date || ''
  const cents = signedAmountCents(tx.transaction_amount, tx.credit_debit_indicator)
  const ref = tx.reference_number || (tx.remittance_information ?? []).join('|')
  const hash = createHash('sha256')
    .update(`${accKey}|${date}|${cents}|${tx.transaction_amount.currency}|${ref}`)
    .digest('hex')
    .slice(0, 24)
  return `fp:${hash}`
}

export interface AccountPreview {
  key: string
  name: string
  ibanMasked: string | null
  currency: string
  product?: string
  principalBalanceCents: number
  principalBalanceType: string | null
  balanceTypesAvailable: string[]
}

export function buildAccountPreview(details: EbAccountDetails, currency: string, balances: EbBalance[]): AccountPreview {
  const principal = pickPrincipalBalance(balances)
  return {
    key: accountKey(details, currency),
    name: details.name || details.product || 'Cuenta',
    ibanMasked: maskIban(details.account_id?.iban),
    currency,
    product: details.product,
    principalBalanceCents: principal ? decimalToCents(principal.balance_amount.amount) : 0,
    principalBalanceType: principal?.balance_type ?? null,
    balanceTypesAvailable: balances.map((b) => b.balance_type ?? 'OTHR'),
  }
}
