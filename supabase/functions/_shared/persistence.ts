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

/**
 * Motor de reglas continuo: "Aplicar esta categoría a movimientos parecidos"
 * ya clasificaba retroactivamente al crear la regla, pero un sync posterior
 * volvía a dejar sin categoría cualquier movimiento nuevo del mismo comercio
 * — la regla se quedaba en `rules` sin volver a usarse nunca. Aquí se
 * reutiliza contra cada tanda de movimientos recién insertados (nunca contra
 * los ya existentes). Solo hay reglas de `match_field: 'description'` en la
 * práctica (es lo único que crea `createRuleFromTransaction`), por eso no
 * hace falta mirar `merchant`/`account`. Primera regla que encaje gana — sin
 * prioridad explícita entre reglas, igual de simple que la coincidencia
 * `ilike` que ya usa la creación de reglas.
 */
async function applyRulesToNewTransactions(
  client: SupabaseClient,
  newTransactions: { id: string; description: string | null }[],
): Promise<void> {
  const { data: rules, error } = await client
    .from('rules')
    .select('id, match_value, category_id')
    .eq('match_field', 'description')
  if (error || !rules || rules.length === 0) return

  const idsByCategory = new Map<string, string[]>()
  for (const tx of newTransactions) {
    if (!tx.description) continue
    const description = tx.description.toLowerCase()
    const rule = rules.find((r) => description.includes((r.match_value as string).toLowerCase()))
    if (!rule) continue
    const categoryId = rule.category_id as string
    idsByCategory.set(categoryId, [...(idsByCategory.get(categoryId) ?? []), tx.id])
  }
  if (idsByCategory.size === 0) return

  await Promise.all(
    [...idsByCategory.entries()].map(([categoryId, ids]) =>
      client.from('transactions').update({ category_id: categoryId }).in('id', ids),
    ),
  )
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
  const newlyInserted: { id: string; description: string | null }[] = []

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
        .select('id, description')
      if (transactionsError) throw new PersistenceError('db_error')
      transactionsNew += inserted?.length ?? 0
      if (inserted) newlyInserted.push(...(inserted as { id: string; description: string | null }[]))
    }
  }

  // Solo movimientos nuevos de este sync, nunca los ya existentes: un re-sync
  // no debe pisar la clasificación que el usuario ya haya puesto a mano. Si
  // esto falla, no debe tumbar un sync que por lo demás fue bien — siempre se
  // puede clasificar después a mano o con "Clasificar todos los pendientes".
  if (newlyInserted.length > 0) {
    try {
      await applyRulesToNewTransactions(client, newlyInserted)
    } catch (err) {
      console.error('persistCollected: fallo al aplicar reglas a movimientos nuevos', err)
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
