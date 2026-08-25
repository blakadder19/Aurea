import type { AccountFunction } from '../../data/accounts'
import { supabase } from '../../lib/supabase/client'
import { REVERSE_FUNCTION_MAP } from './useRealAccounts'

const MANUAL_CONNECTION_NAME = 'Cuentas manuales'

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * La conexión "manual" del usuario: una fila fija de bank_connections
 * (provider='manual') que sirve de padre para todas sus cuentas manuales,
 * igual que una conexión real de banco. Se crea la primera vez que hace
 * falta; las siguientes veces se reutiliza.
 */
async function getOrCreateManualConnectionId(userId: string): Promise<string | null> {
  if (!supabase) return null
  const { data: existing, error: selectError } = await supabase
    .from('bank_connections')
    .select('id')
    .eq('provider', 'manual')
    .eq('aspsp_name', MANUAL_CONNECTION_NAME)
    .maybeSingle()
  if (selectError) {
    console.error('getOrCreateManualConnectionId: fallo al leer', selectError)
    return null
  }
  if (existing) return existing.id as string

  const { data: created, error: insertError } = await supabase
    .from('bank_connections')
    .insert({ user_id: userId, provider: 'manual', aspsp_name: MANUAL_CONNECTION_NAME, aspsp_country: '', status: 'connected' })
    .select('id')
    .single()
  if (insertError || !created) {
    console.error('getOrCreateManualConnectionId: fallo al crear', insertError)
    return null
  }
  return created.id as string
}

/**
 * Crea una cuenta manual (sin banco conectado detrás) con un saldo inicial,
 * registrado como su primer movimiento ("Saldo inicial") — así el saldo de
 * la cuenta siempre es la suma de sus propios movimientos, igual que
 * cualquier otra cuenta, solo que sin sincronización bancaria detrás.
 */
export async function createManualAccount(name: string, fn: AccountFunction, startingBalanceCents: number): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'
  if (!name.trim()) return 'Ponle un nombre a la cuenta.'
  const dbFunction = REVERSE_FUNCTION_MAP[fn]
  if (!dbFunction) return 'Función no válida.'

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 'Inicia sesión de nuevo.'

  const connectionId = await getOrCreateManualConnectionId(user.id)
  if (!connectionId) return 'No hemos podido crear la cuenta. Inténtalo de nuevo.'

  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .insert({
      user_id: user.id,
      connection_id: connectionId,
      external_account_id: `manual-${crypto.randomUUID()}`,
      currency: 'EUR',
      name: name.trim(),
      account_function: dbFunction,
    })
    .select('id')
    .single()
  if (accountError || !account) {
    console.error('createManualAccount: fallo al crear la cuenta', accountError)
    return 'No hemos podido crear la cuenta. Inténtalo de nuevo.'
  }
  const accountId = account.id as string

  const { error: txError } = await supabase.from('transactions').insert({
    user_id: user.id,
    account_id: accountId,
    dedup_key: `manual-initial-${crypto.randomUUID()}`,
    amount_cents: startingBalanceCents,
    currency: 'EUR',
    credit_debit: startingBalanceCents >= 0 ? 'CRDT' : 'DBIT',
    booking_date: todayIso(),
    description: 'Saldo inicial',
  })
  if (txError) {
    console.error('createManualAccount: fallo al registrar el saldo inicial', txError)
    return 'La cuenta se creó, pero no hemos podido registrar el saldo inicial. Actualiza la página.'
  }

  const { error: balanceError } = await supabase
    .from('balances')
    .upsert(
      { user_id: user.id, account_id: accountId, balance_type: 'MANUAL', amount_cents: startingBalanceCents, currency: 'EUR' },
      { onConflict: 'account_id,balance_type' },
    )
  if (balanceError) {
    console.error('createManualAccount: fallo al guardar el saldo', balanceError)
    return 'La cuenta se creó, pero no hemos podido guardar el saldo. Actualiza la página.'
  }

  return null
}

/**
 * Añade un movimiento manual a una cuenta manual ya existente y mantiene su
 * saldo al día (balances.amount_cents += el importe del movimiento). Solo
 * tiene sentido en cuentas manuales: una cuenta sincronizada con un banco
 * refleja siempre lo que dice el banco, nunca algo escrito a mano.
 */
export async function addManualTransaction(
  accountId: string,
  description: string,
  amountCents: number,
  dateIso: string,
  categoryId: string | null,
): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'
  if (!description.trim()) return 'Ponle una descripción al movimiento.'
  if (amountCents === 0) return 'El importe no puede ser 0.'

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 'Inicia sesión de nuevo.'

  const { error: txError } = await supabase.from('transactions').insert({
    user_id: user.id,
    account_id: accountId,
    dedup_key: `manual-${crypto.randomUUID()}`,
    amount_cents: amountCents,
    currency: 'EUR',
    credit_debit: amountCents >= 0 ? 'CRDT' : 'DBIT',
    booking_date: dateIso,
    description: description.trim(),
    category_id: categoryId,
  })
  if (txError) {
    console.error('addManualTransaction: fallo al guardar el movimiento', txError)
    return 'No hemos podido guardar el movimiento. Inténtalo de nuevo.'
  }

  const { data: currentBalance, error: readError } = await supabase
    .from('balances')
    .select('amount_cents')
    .eq('account_id', accountId)
    .eq('balance_type', 'MANUAL')
    .maybeSingle()
  if (readError) {
    console.error('addManualTransaction: fallo al leer el saldo', readError)
    return 'El movimiento se guardó, pero no hemos podido actualizar el saldo. Actualiza la página.'
  }

  const newBalanceCents = ((currentBalance?.amount_cents as number | undefined) ?? 0) + amountCents
  const { error: writeError } = await supabase
    .from('balances')
    .upsert(
      { user_id: user.id, account_id: accountId, balance_type: 'MANUAL', amount_cents: newBalanceCents, currency: 'EUR' },
      { onConflict: 'account_id,balance_type' },
    )
  if (writeError) {
    console.error('addManualTransaction: fallo al guardar el saldo', writeError)
    return 'El movimiento se guardó, pero no hemos podido actualizar el saldo. Actualiza la página.'
  }

  return null
}
