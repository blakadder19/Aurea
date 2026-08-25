import type { AccountFunction } from '../../data/accounts'
import { dedupeKey } from '../../lib/csvImport'
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

async function adjustManualBalance(accountId: string, userId: string, deltaCents: number): Promise<string | null> {
  if (deltaCents === 0 || !supabase) return null
  const { data: currentBalance, error: readError } = await supabase
    .from('balances')
    .select('amount_cents')
    .eq('account_id', accountId)
    .eq('balance_type', 'MANUAL')
    .maybeSingle()
  if (readError) {
    console.error('adjustManualBalance: fallo al leer el saldo', readError)
    return 'No hemos podido actualizar el saldo. Actualiza la página.'
  }
  const newBalanceCents = ((currentBalance?.amount_cents as number | undefined) ?? 0) + deltaCents
  const { error: writeError } = await supabase
    .from('balances')
    .upsert(
      { user_id: userId, account_id: accountId, balance_type: 'MANUAL', amount_cents: newBalanceCents, currency: 'EUR' },
      { onConflict: 'account_id,balance_type' },
    )
  if (writeError) {
    console.error('adjustManualBalance: fallo al guardar el saldo', writeError)
    return 'No hemos podido actualizar el saldo. Actualiza la página.'
  }
  return null
}

/**
 * Corrige un movimiento manual ya existente — importe, descripción o fecha —
 * y ajusta el saldo de su cuenta solo por la diferencia entre el importe
 * antiguo y el nuevo, nunca restando/sumando el importe completo dos veces.
 */
export async function updateManualTransaction(
  id: string,
  accountId: string,
  description: string,
  amountCents: number,
  dateIso: string,
): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'
  if (!description.trim()) return 'Ponle una descripción al movimiento.'
  if (amountCents === 0) return 'El importe no puede ser 0.'

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 'Inicia sesión de nuevo.'

  const { data: current, error: readError } = await supabase.from('transactions').select('amount_cents').eq('id', id).maybeSingle()
  if (readError || !current) {
    console.error('updateManualTransaction: fallo al leer el movimiento', readError)
    return 'No hemos podido leer el movimiento. Inténtalo de nuevo.'
  }
  const delta = amountCents - (current.amount_cents as number)

  const { error: updateError } = await supabase
    .from('transactions')
    .update({
      description: description.trim(),
      amount_cents: amountCents,
      credit_debit: amountCents >= 0 ? 'CRDT' : 'DBIT',
      booking_date: dateIso,
    })
    .eq('id', id)
  if (updateError) {
    console.error('updateManualTransaction: fallo al guardar', updateError)
    return 'No hemos podido guardar los cambios. Inténtalo de nuevo.'
  }

  return adjustManualBalance(accountId, user.id, delta)
}

/**
 * Borra un movimiento manual y ajusta el saldo de su cuenta restando el
 * importe que tenía. Solo puede afectar a movimientos que cuelgan de una
 * cuenta manual — la base de datos lo impone también a nivel de RLS, esto
 * es solo la capa de la app.
 */
export async function deleteManualTransaction(id: string, accountId: string): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 'Inicia sesión de nuevo.'

  const { data: current, error: readError } = await supabase.from('transactions').select('amount_cents').eq('id', id).maybeSingle()
  if (readError || !current) {
    console.error('deleteManualTransaction: fallo al leer el movimiento', readError)
    return 'No hemos podido leer el movimiento. Inténtalo de nuevo.'
  }

  const { error: deleteError } = await supabase.from('transactions').delete().eq('id', id)
  if (deleteError) {
    console.error('deleteManualTransaction: fallo al borrar', deleteError)
    return 'No hemos podido borrar el movimiento. Inténtalo de nuevo.'
  }

  return adjustManualBalance(accountId, user.id, -(current.amount_cents as number))
}

/**
 * Borra una cuenta manual entera junto con sus movimientos y su saldo.
 * Orden explícito (transactions y balances antes que accounts) para no
 * depender de si el ON DELETE CASCADE de la base de datos se aplica bajo
 * RLS — así el resultado es el mismo pase lo que pase ahí.
 */
export async function deleteManualAccount(accountId: string): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'

  const { error: txError } = await supabase.from('transactions').delete().eq('account_id', accountId)
  if (txError) {
    console.error('deleteManualAccount: fallo al borrar los movimientos', txError)
    return 'No hemos podido borrar los movimientos de la cuenta. Inténtalo de nuevo.'
  }

  const { error: balanceError } = await supabase.from('balances').delete().eq('account_id', accountId)
  if (balanceError) {
    console.error('deleteManualAccount: fallo al borrar el saldo', balanceError)
    return 'No hemos podido borrar el saldo de la cuenta. Inténtalo de nuevo.'
  }

  const { error: accountError } = await supabase.from('accounts').delete().eq('id', accountId)
  if (accountError) {
    console.error('deleteManualAccount: fallo al borrar la cuenta', accountError)
    return 'No hemos podido borrar la cuenta. Inténtalo de nuevo.'
  }

  return null
}

/** Claves de deduplicación (fecha|importe|descripción) de los movimientos ya existentes en una cuenta, para no reimportar lo que ya está. */
export async function fetchExistingDedupeKeys(accountId: string): Promise<Set<string>> {
  if (!supabase) return new Set()
  const { data, error } = await supabase.from('transactions').select('booking_date, amount_cents, description').eq('account_id', accountId)
  if (error || !data) {
    console.error('fetchExistingDedupeKeys: fallo al leer', error)
    return new Set()
  }
  return new Set(
    data
      .filter((t) => t.booking_date)
      .map((t) => dedupeKey(t.booking_date as string, t.amount_cents as number, (t.description as string | null) ?? '')),
  )
}

export interface ImportableRow {
  dateIso: string
  description: string
  amountCents: number
  note: string
}

/** Da de alta en bloque las filas aceptadas de una importación CSV y ajusta el saldo una sola vez por la suma de todas. */
export async function importManualTransactions(accountId: string, rows: ImportableRow[]): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'
  if (rows.length === 0) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 'Inicia sesión de nuevo.'

  const { error: txError } = await supabase.from('transactions').insert(
    rows.map((row) => ({
      user_id: user.id,
      account_id: accountId,
      dedup_key: `manual-import-${crypto.randomUUID()}`,
      amount_cents: row.amountCents,
      currency: 'EUR',
      credit_debit: row.amountCents >= 0 ? 'CRDT' : 'DBIT',
      booking_date: row.dateIso,
      description: row.description,
      user_note: row.note || null,
    })),
  )
  if (txError) {
    console.error('importManualTransactions: fallo al guardar los movimientos', txError)
    return 'No hemos podido guardar los movimientos importados. Inténtalo de nuevo.'
  }

  const total = rows.reduce((sum, row) => sum + row.amountCents, 0)
  return adjustManualBalance(accountId, user.id, total)
}
