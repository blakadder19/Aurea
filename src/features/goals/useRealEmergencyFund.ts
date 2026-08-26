import { useEffect, useState } from 'react'
import type { Account } from '../../data/accounts'
import { supabase } from '../../lib/supabase/client'
import { useAuthStore } from '../../lib/supabase/useAuth'
import { computeMonthlyAverages } from '../planning/useRealPlanning'

const TARGET_MONTHS = 6

export interface RealEmergencyFund {
  savedEuros: number
  monthlyEssentialSpend: number
  targetMonths: number
  targetEuros: number
  monthsCovered: number
}

/**
 * "Gasto esencial" se aproxima al gasto medio mensual total (misma
 * simplificación que Planificación): no hay ninguna señal fiable de qué
 * categorías son estrictamente esenciales frente a discrecionales, así que
 * usar el gasto medio real de verdad es más honesto que inventar un
 * desglose "esencial vs. no esencial" sin datos que lo respalden.
 */
export function computeEmergencyFund(savedEuros: number, monthlyEssentialSpend: number): RealEmergencyFund {
  const targetEuros = monthlyEssentialSpend * TARGET_MONTHS
  const monthsCovered = monthlyEssentialSpend > 0 ? savedEuros / monthlyEssentialSpend : 0
  return { savedEuros, monthlyEssentialSpend, targetMonths: TARGET_MONTHS, targetEuros, monthsCovered }
}

interface RealEmergencyFundResult {
  loading: boolean
  /** null mientras carga, sin sesión, o mientras las cuentas todavía no se saben. */
  data: RealEmergencyFund | null
}

/** Fondo de emergencia real: cuentas de función "Ahorro" frente al gasto medio mensual de tus movimientos. */
export function useRealEmergencyFund(accounts: Account[] | null): RealEmergencyFundResult {
  const session = useAuthStore((s) => s.session)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<RealEmergencyFund | null>(null)

  useEffect(() => {
    if (!supabase || !session || accounts === null) {
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
      // Tope generoso, no un recorte real: a más de 10.000 movimientos (~6 años al ritmo actual)
      // habría que paginar de verdad, igual que ya hace Movimientos.
      const { data: rows, error } = await supabase
        .from('transactions')
        .select('amount_cents, credit_debit, booking_date, value_date')
        .limit(10000)
      if (cancelled) return
      if (error) console.error('useRealEmergencyFund: fallo al leer transactions', error)

      const parsed = (rows ?? []).flatMap((tx) => {
        const dateISO = (tx.booking_date as string | null) ?? (tx.value_date as string | null)
        if (!dateISO) return []
        return [{ amountCents: tx.amount_cents as number, creditDebit: tx.credit_debit as string, dateISO }]
      })
      const { gastos } = computeMonthlyAverages(parsed)

      const savedEuros = (accounts ?? [])
        .filter((a) => a.fn === 'Ahorro' && (a.currency === undefined || a.currency === 'EUR'))
        .reduce((sum, a) => sum + a.balance * ((a.sharePercent ?? 100) / 100), 0)

      setData(computeEmergencyFund(savedEuros, gastos))
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [session, accounts])

  return { loading, data }
}
