import { useEffect, useState } from 'react'
import type { Account } from '../../data/accounts'
import { supabase } from '../../lib/supabase/client'
import { useAuthStore } from '../../lib/supabase/useAuth'
import { reconstructNetWorthSeries, type NetWorthPoint } from './netWorthHistory'

interface RealNetWorthHistoryResult {
  loading: boolean
  /** null mientras carga, sin sesión, o mientras faltan cuentas/patrimonio actual. */
  points: NetWorthPoint[] | null
}

/**
 * Reconstruye el patrimonio neto real en el rango [fromDateIso, hoy] a
 * partir del patrimonio actual (ya calculado por la pantalla, con el mismo
 * filtro EUR/elegibilidad) y las transacciones de esas mismas cuentas desde
 * fromDateIso. `fromDateIso` es null mientras el periodo elegido todavía no
 * se sabe (Ajustes cargando, por ejemplo) — en ese caso no se consulta nada.
 */
export function useNetWorthHistory(
  accounts: Account[] | null,
  currentNetWorth: number | null,
  fromDateIso: string | null,
): RealNetWorthHistoryResult {
  const session = useAuthStore((s) => s.session)
  const [loading, setLoading] = useState(true)
  const [points, setPoints] = useState<NetWorthPoint[] | null>(null)

  useEffect(() => {
    if (!supabase || !session || accounts === null || currentNetWorth === null || fromDateIso === null) {
      if (!supabase || !session) {
        setPoints(null)
        setLoading(false)
      }
      return
    }

    const eligibleAccounts = accounts.filter((a) => a.currency === undefined || a.currency === 'EUR')
    const accountIds = eligibleAccounts.map((a) => a.id)
    if (accountIds.length === 0) {
      setPoints([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    const netWorth = currentNetWorth
    const from = fromDateIso

    async function load() {
      if (!supabase) return
      const { data, error } = await supabase
        .from('transactions')
        .select('account_id, booking_date, value_date, amount_cents')
        .in('account_id', accountIds)
        .or(`booking_date.gte.${from},and(booking_date.is.null,value_date.gte.${from})`)
      if (cancelled) return
      if (error) {
        console.error('useNetWorthHistory: fallo al leer transactions', error)
        setPoints(null)
        setLoading(false)
        return
      }

      const transactions = (data ?? []).flatMap((tx) => {
        const dateISO = (tx.booking_date as string | null) ?? (tx.value_date as string | null)
        if (!dateISO) return []
        return [{ accountId: tx.account_id as string, dateISO, amountCents: tx.amount_cents as number }]
      })
      const shareByAccount = new Map(eligibleAccounts.map((a) => [a.id, a.sharePercent ?? 100]))
      const today = new Date()
      const toDateIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

      setPoints(reconstructNetWorthSeries(netWorth, transactions, shareByAccount, from, toDateIso))
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [session, accounts, currentNetWorth, fromDateIso])

  return { loading, points }
}
