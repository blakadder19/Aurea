import type { Account } from '../../data/accounts'
import { supabase } from '../../lib/supabase/client'

/**
 * Guarda una foto de los saldos de hoy, si no la hay ya.
 *
 * Se escribe desde el cliente (al cargar Cuentas) y no desde la
 * sincronización bancaria a propósito: así el histórico también recoge las
 * cuentas manuales — un piso revalorizado, una hucha — que el banco no ve.
 * La tabla es append-only con unique por (usuario, cuenta, día), así que
 * llamar a esto de más es inofensivo: el insert duplicado se ignora.
 */
export async function recordBalanceSnapshot(accounts: Account[], todayIso: string): Promise<void> {
  if (!supabase || accounts.length === 0) return

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { data: existing, error: readError } = await supabase
    .from('balance_snapshots')
    .select('account_id')
    .eq('snapshot_date', todayIso)
  if (readError) {
    console.error('recordBalanceSnapshot: fallo al comprobar el día de hoy', readError)
    return
  }

  const alreadySaved = new Set((existing ?? []).map((r) => r.account_id as string))
  const rows = accounts
    .filter((a) => !alreadySaved.has(a.id))
    .map((a) => ({
      user_id: user.id,
      account_id: a.id,
      snapshot_date: todayIso,
      amount_cents: Math.round(a.balance * 100),
      currency: a.currency ?? 'EUR',
    }))
  if (rows.length === 0) return

  const { error: writeError } = await supabase.from('balance_snapshots').insert(rows)
  // Sin ruido para el usuario: perder una foto de un día no rompe nada, el
  // gráfico sigue reconstruyéndose desde los movimientos como hasta ahora.
  if (writeError) console.error('recordBalanceSnapshot: fallo al guardar', writeError)
}
