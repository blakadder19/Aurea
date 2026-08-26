import { useEffect, useState } from 'react'
import type { Account } from '../../data/accounts'
import { cycleEnd, cycleStart, isoDate } from '../../lib/budgetCalc'
import { supabase } from '../../lib/supabase/client'
import { useAuthStore } from '../../lib/supabase/useAuth'

export interface RealNonSpendSummary {
  ahorroCents: number
  inversionCents: number
  transferenciasCents: number
}

/**
 * "Lo que no es consumo" real: dinero que entró este ciclo en cuentas
 * función Ahorro/Inversión (simplificación — no distingue si viene de una
 * transferencia propia o de fuera, como un ingreso directo a la cuenta de
 * ahorro), más el total movido en transferencias entre tus propias cuentas
 * (`is_internal_transfer`, ya usado en otras pantallas). Si no tienes
 * ninguna cuenta con esa función, el número sale honestamente en 0 — no se
 * fabrica un valor de reemplazo.
 */
export function useRealNonSpend(
  accounts: Account[] | null,
  budgetMonthStart: number | null,
  monthOffset = 0,
): { loading: boolean; data: RealNonSpendSummary | null } {
  const session = useAuthStore((s) => s.session)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<RealNonSpendSummary | null>(null)

  useEffect(() => {
    if (!supabase || !session || accounts === null || budgetMonthStart === null) {
      if (!supabase || !session) {
        setData(null)
        setLoading(false)
      }
      return
    }

    let cancelled = false
    setLoading(true)

    async function load() {
      if (!supabase) return
      const currentCycleStart = cycleStart(new Date(), budgetMonthStart!)
      const start = new Date(currentCycleStart.getFullYear(), currentCycleStart.getMonth() - monthOffset, currentCycleStart.getDate())
      const end = cycleEnd(start)
      const from = isoDate(start)
      const to = isoDate(end)
      const dateFilter =
        `and(booking_date.gte.${from},booking_date.lt.${to}),` +
        `and(booking_date.is.null,value_date.gte.${from},value_date.lt.${to})`

      const ahorroAccountIds = (accounts ?? []).filter((a) => a.fn === 'Ahorro').map((a) => a.id)
      const inversionAccountIds = (accounts ?? []).filter((a) => a.fn === 'Inversión').map((a) => a.id)

      const { data: txRows, error: txError } = await supabase
        .from('transactions')
        .select('account_id, amount_cents, is_internal_transfer')
        .or(dateFilter)
      if (cancelled) return
      if (txError || !txRows) {
        console.error('useRealNonSpend: fallo al leer transactions', txError)
        setData(null)
        setLoading(false)
        return
      }

      let ahorroCents = 0
      let inversionCents = 0
      let transferenciasCents = 0
      for (const tx of txRows) {
        const amount = tx.amount_cents as number
        const accountId = tx.account_id as string
        if (tx.is_internal_transfer) transferenciasCents += Math.abs(amount)
        if (amount <= 0) continue
        if (ahorroAccountIds.includes(accountId)) ahorroCents += amount
        else if (inversionAccountIds.includes(accountId)) inversionCents += amount
      }

      setData({ ahorroCents, inversionCents, transferenciasCents })
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [session, accounts, budgetMonthStart, monthOffset])

  return { loading, data }
}
