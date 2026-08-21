import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { decimalToCents, maskIban, pickPrincipalBalance, signedAmountCents, transactionFingerprint } from './normalize.ts'
import type { CollectedAccount } from './sync.ts'

export class PersistenceError extends Error {
  constructor(public readonly code: 'unauthorized' | 'db_error') {
    super(code)
    this.name = 'PersistenceError'
  }
}

function toDate(iso: string | undefined): string | null {
  return iso ? iso.slice(0, 10) : null
}

interface PersistParams {
  client: SupabaseClient
  userId: string
  aspspName: string
  aspspCountry: string
  sessionId: string
  accountUids: string[]
  windowFrom: string
  accounts: CollectedAccount[]
}

export interface PersistResult {
  connectionId: string
  accounts: number
  transactionsNew: number
}

/**
 * Persiste el snapshot recolectado. Siempre con el JWT del propio usuario
 * (RLS), nunca `service-role`. Portado de `persistCollected` en Finanzas:
 * mismos upserts idempotentes, mismas claves de conflicto.
 */
export async function persistCollected(params: PersistParams): Promise<PersistResult> {
  const { client, userId, aspspName, aspspCountry, sessionId, accountUids, windowFrom, accounts } = params

  const { data: connection, error: connectionError } = await client
    .from('bank_connections')
    .upsert(
      {
        user_id: userId,
        provider: 'enable_banking',
        aspsp_name: aspspName,
        aspsp_country: aspspCountry,
        status: 'connected',
        eb_session_id: sessionId,
        eb_account_uids: accountUids,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider,aspsp_name,aspsp_country' },
    )
    .select('id')
    .single()
  if (connectionError || !connection) throw new PersistenceError('db_error')
  const connectionId = connection.id as string

  let transactionsNew = 0

  for (const account of accounts) {
    const principal = pickPrincipalBalance(account.balances)
    const { data: accountRow, error: accountError } = await client
      .from('accounts')
      .upsert(
        {
          user_id: userId,
          connection_id: connectionId,
          external_account_id: account.uid,
          currency: account.currency,
          name: account.details.name || account.details.product || 'Cuenta',
          product: account.details.product ?? null,
          iban_masked: maskIban(account.details.account_id?.iban),
          principal_balance_type: principal?.balance_type ?? null,
        },
        { onConflict: 'user_id,external_account_id,currency' },
      )
      .select('id')
      .single()
    if (accountError || !accountRow) throw new PersistenceError('db_error')
    const accountId = accountRow.id as string

    if (account.balances.length > 0) {
      const balanceRows = account.balances.map((b) => ({
        user_id: userId,
        account_id: accountId,
        balance_type: b.balance_type ?? 'OTHR',
        amount_cents: decimalToCents(b.balance_amount.amount),
        currency: b.balance_amount.currency,
        reference_date: toDate(b.reference_date),
      }))
      const { error: balancesError } = await client
        .from('balances')
        .upsert(balanceRows, { onConflict: 'account_id,balance_type' })
      if (balancesError) throw new PersistenceError('db_error')
    }

    if (account.transactions.length > 0) {
      const seen = new Set<string>()
      const transactionRows = account.transactions
        .map((tx) => ({
          user_id: userId,
          account_id: accountId,
          external_id: tx.entry_reference ?? null,
          dedup_key: transactionFingerprint(account.key, tx),
          amount_cents: signedAmountCents(tx.transaction_amount, tx.credit_debit_indicator),
          currency: tx.transaction_amount.currency,
          credit_debit: tx.credit_debit_indicator === 'DBIT' ? 'DBIT' : 'CRDT',
          status: tx.status ?? null,
          booking_date: toDate(tx.booking_date),
          value_date: toDate(tx.value_date),
          description: (tx.remittance_information ?? []).join(' ') || null,
        }))
        // "último gana" dentro del propio lote si Enable Banking repitiera una fila.
        .filter((row) => (seen.has(row.dedup_key) ? false : (seen.add(row.dedup_key), true)))

      const { data: inserted, error: transactionsError } = await client
        .from('transactions')
        .upsert(transactionRows, { onConflict: 'user_id,account_id,dedup_key', ignoreDuplicates: true })
        .select('id')
      if (transactionsError) throw new PersistenceError('db_error')
      transactionsNew += inserted?.length ?? 0
    }
  }

  // Prueba duradera de finalización: si falla, el llamador NO reporta éxito,
  // aunque cuentas/saldos/movimientos ya se hayan escrito (son idempotentes:
  // reintentar es seguro).
  const { error: syncRunError } = await client.from('sync_runs').insert({
    user_id: userId,
    connection_id: connectionId,
    finished_at: new Date().toISOString(),
    status: 'ok',
    accounts_count: accounts.length,
    transactions_new: transactionsNew,
    window_from: windowFrom,
  })
  if (syncRunError) throw new PersistenceError('db_error')

  return { connectionId, accounts: accounts.length, transactionsNew }
}
