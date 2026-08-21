import { CONSENT_DAYS, INITIAL_TRANSACTION_WINDOW_DAYS, type Credentials } from './config.ts'
import {
  EbApiError,
  getAccountBalances,
  getAccountDetails,
  getAccountTransactions,
  getSession,
  type TokenProvider,
} from './enableBanking.ts'
import type { EbAccountDetails, EbBalance, EbTransaction } from './normalize.ts'
import { accountKey } from './normalize.ts'

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Consentimiento válido durante `CONSENT_DAYS` desde ahora (ISO datetime, para `startAuth`). */
export function consentValidUntil(now: Date = new Date()): string {
  const until = new Date(now)
  until.setUTCDate(until.getUTCDate() + CONSENT_DAYS)
  return until.toISOString()
}

/** Siempre el máximo histórico disponible en Enable Banking (90 días) — usado por `save`. */
export function fullHistoryWindowStart(now: Date = new Date()): string {
  const from = new Date(now)
  from.setUTCDate(from.getUTCDate() - INITIAL_TRANSACTION_WINDOW_DAYS)
  return isoDate(from)
}

export interface CollectedAccount {
  uid: string
  key: string
  currency: string
  details: EbAccountDetails
  balances: EbBalance[]
  transactions: EbTransaction[]
}

export type CollectResult =
  | { status: 'needs_reconnect' }
  | { status: 'ok'; data: { aspspName?: string; aspspCountry?: string; windowFrom: string; accounts: CollectedAccount[] } }

/**
 * Recupera cuentas + saldos + movimientos desde Enable Banking, sin persistir
 * nada — puro fetch. Portado de `collectRealData` en Finanzas, simplificado:
 * sin caché local de sesión (aquí la sesión viene de `bank_connections`).
 */
export async function collectRealData(
  creds: Credentials,
  getToken: TokenProvider,
  session: { sessionId: string; accountUids: string[] },
  windowStart: string,
): Promise<CollectResult> {
  const live = await getSession(getToken, session.sessionId)
  if ((live.status ?? '').toUpperCase() !== 'AUTHORIZED') {
    return { status: 'needs_reconnect' }
  }

  const accountUids = live.accounts.length > 0 ? live.accounts : session.accountUids
  const accounts: CollectedAccount[] = []

  for (const uid of accountUids) {
    const details = await getAccountDetails(getToken, uid)
    const balances = await getAccountBalances(getToken, uid)
    const currency = balances[0]?.balance_amount.currency ?? details.currency ?? 'EUR'
    const transactions = await getAccountTransactions(getToken, uid, windowStart)
    accounts.push({ uid, key: accountKey(details, currency), currency, details, balances, transactions })
  }

  return {
    status: 'ok',
    data: {
      aspspName: live.aspsp?.name,
      aspspCountry: live.aspsp?.country,
      windowFrom: windowStart,
      accounts,
    },
  }
}

export { EbApiError }
