import { useEffect, useState } from 'react'
import type { Account, AccountFunction } from '../../data/accounts'
import { formatIsoDayMonth } from '../../lib/format'
import { supabase } from '../../lib/supabase/client'
import { useAuthStore } from '../../lib/supabase/useAuth'

/** account_function (esquema real) → AccountFunction (forma que ya consume la UI). */
const FUNCTION_MAP: Record<string, AccountFunction> = {
  gastar: 'Para gastar',
  pagos: 'Para gastar',
  ahorro: 'Ahorro',
  inversion: 'Inversión',
  deuda: 'Deuda',
  activo_manual: 'Activo manual',
  por_confirmar: 'Por confirmar',
}

/** AccountFunction (UI) → account_function (esquema real). Inverso de FUNCTION_MAP, sin 'Por confirmar' (no es un destino válido). */
export const REVERSE_FUNCTION_MAP: Partial<Record<AccountFunction, string>> = {
  'Para gastar': 'gastar',
  Ahorro: 'ahorro',
  Inversión: 'inversion',
  Deuda: 'deuda',
  'Activo manual': 'activo_manual',
}

/** Escribe la función elegida por el usuario para una cuenta real. RLS asegura que solo puede tocar las suyas. */
export async function updateAccountFunction(accountId: string, fn: AccountFunction): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'
  const dbValue = REVERSE_FUNCTION_MAP[fn]
  if (!dbValue) return 'Función no válida.'
  const { error } = await supabase.from('accounts').update({ account_function: dbValue }).eq('id', accountId)
  if (error) {
    console.error('updateAccountFunction: fallo al guardar', error)
    return 'No hemos podido guardar el cambio. Inténtalo de nuevo.'
  }
  return null
}

/**
 * Escribe qué porcentaje del saldo de una cuenta cuenta como patrimonio
 * propio del usuario (0-100, 100 por defecto) — pensado para cuentas
 * compartidas (p. ej. una cuenta conjunta), pero aplicable a cualquier cuenta.
 */
export async function updateAccountSharePercent(accountId: string, percent: number): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) return 'Debe ser un número entero entre 0 y 100.'
  const { error } = await supabase.from('accounts').update({ share_percent: percent }).eq('id', accountId)
  if (error) {
    console.error('updateAccountSharePercent: fallo al guardar', error)
    return 'No hemos podido guardar el cambio. Inténtalo de nuevo.'
  }
  return null
}

interface RealAccountsResult {
  loading: boolean
  /** null mientras carga o si no hay sesión — no confundir con "cero cuentas". */
  accounts: Account[] | null
  /** Vuelve a leer accounts+balances+transactions — úsalo tras una escritura (p. ej. cambiar función). */
  refetch: () => void
}

/**
 * Cuentas reales del usuario autenticado (Fase 1): accounts + balances +
 * últimos movimientos por cuenta, con la misma forma que `Account` en
 * data/accounts.ts — así AccountsTable/AccountDetailPanel no cambian nada.
 * Las cuentas con account_function = 'excluida' no se muestran.
 */
export function useRealAccounts(): RealAccountsResult {
  const session = useAuthStore((s) => s.session)
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!supabase || !session) {
      setAccounts(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    async function load() {
      if (!supabase) return
      const [{ data: accountRows, error: accountsError }, { data: connectionRows }] = await Promise.all([
        supabase
          .from('accounts')
          .select('id, name, product, connection_id, account_function, share_percent, currency')
          .neq('account_function', 'excluida')
          .order('created_at', { ascending: true }),
        supabase.from('bank_connections').select('id, aspsp_name, provider'),
      ])
      if (cancelled) return
      if (accountsError || !accountRows) {
        console.error('useRealAccounts: fallo al leer accounts', accountsError)
        setAccounts([])
        setLoading(false)
        return
      }

      const institutionByConnection = new Map((connectionRows ?? []).map((c) => [c.id, c.aspsp_name as string]))
      const manualConnectionIds = new Set((connectionRows ?? []).filter((c) => c.provider === 'manual').map((c) => c.id as string))
      const accountIds = accountRows.map((a) => a.id as string)
      if (accountIds.length === 0) {
        setAccounts([])
        setLoading(false)
        return
      }

      const [{ data: balanceRows }, { data: transactionRows }] = await Promise.all([
        supabase.from('balances').select('account_id, amount_cents').in('account_id', accountIds),
        supabase
          .from('transactions')
          .select('account_id, booking_date, value_date, description, amount_cents')
          .in('account_id', accountIds)
          .order('booking_date', { ascending: false })
          .limit(80),
      ])
      if (cancelled) return

      const balanceByAccount = new Map((balanceRows ?? []).map((b) => [b.account_id as string, b.amount_cents as number]))
      const movementsByAccount = new Map<string, { date: string; label: string; amount: number }[]>()
      for (const tx of transactionRows ?? []) {
        const list = movementsByAccount.get(tx.account_id as string) ?? []
        if (list.length >= 2) continue
        const isoDate = (tx.booking_date as string | null) ?? (tx.value_date as string | null)
        list.push({
          date: isoDate ? formatIsoDayMonth(isoDate) : '',
          label: (tx.description as string | null) || 'Movimiento',
          amount: (tx.amount_cents as number) / 100,
        })
        movementsByAccount.set(tx.account_id as string, list)
      }

      const mapped: Account[] = accountRows.map((row) => {
        const fn = FUNCTION_MAP[row.account_function as string] ?? 'Por confirmar'
        return {
          id: row.id as string,
          name: (row.name as string | null) || (row.product as string | null) || 'Cuenta',
          institution: institutionByConnection.get(row.connection_id as string) ?? 'Banco conectado',
          fn,
          balance: (balanceByAccount.get(row.id as string) ?? 0) / 100,
          sharePercent: (row.share_percent as number | null) ?? 100,
          currency: row.currency as string,
          countsInAvailableToday: fn === 'Para gastar',
          recentMovements: movementsByAccount.get(row.id as string) ?? [],
          isManual: manualConnectionIds.has(row.connection_id as string),
        }
      })

      setAccounts(mapped)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [session, version])

  return { loading, accounts, refetch: () => setVersion((v) => v + 1) }
}
