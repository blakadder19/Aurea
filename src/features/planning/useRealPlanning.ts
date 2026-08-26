import { useEffect, useState } from 'react'
import type { Account } from '../../data/accounts'
import { fetchActiveDeclaredIncomeCents } from '../../lib/declaredIncome'
import { supabase } from '../../lib/supabase/client'
import { useAuthStore } from '../../lib/supabase/useAuth'
import type { RealDebt } from '../debts/useRealDebts'

export interface RealPlanningInputs {
  startingNetWorth: number
  avgDebtRate: number
  avgMonthlyIngresos: number
  avgMonthlyGastos: number
}

/** Patrimonio neto real: mismo cálculo que Cuentas y patrimonio (EUR, ponderado por sharePercent). */
export function computeStartingNetWorth(accounts: Account[]): number {
  const { assets, liabilities } = accounts
    .filter((a) => a.currency === undefined || a.currency === 'EUR')
    .reduce(
      (acc, a) => {
        const share = a.balance * ((a.sharePercent ?? 100) / 100)
        return share >= 0 ? { ...acc, assets: acc.assets + share } : { ...acc, liabilities: acc.liabilities - share }
      },
      { assets: 0, liabilities: 0 },
    )
  return assets - liabilities
}

/** Tasa media ponderada por saldo de las deudas reales. 0 si no hay deuda (nada que "dejar de pagar"). */
export function computeAvgDebtRate(debts: RealDebt[]): number {
  const totalBalanceCents = debts.reduce((sum, d) => sum + d.balanceCents, 0)
  if (totalBalanceCents === 0) return 0
  return debts.reduce((sum, d) => sum + d.balanceCents * (d.annualRateBps / 10000), 0) / totalBalanceCents
}

interface MonthlyAverages {
  ingresos: number
  gastos: number
}

/** Media mensual de ingresos (CRDT) y gastos (DBIT), sobre los meses con movimientos reales. */
export function computeMonthlyAverages(rows: { amountCents: number; creditDebit: string; dateISO: string }[]): MonthlyAverages {
  const months = new Set<string>()
  let incomeCents = 0
  let expenseCents = 0
  for (const row of rows) {
    months.add(row.dateISO.slice(0, 7))
    if (row.creditDebit === 'CRDT') incomeCents += Math.abs(row.amountCents)
    else if (row.creditDebit === 'DBIT') expenseCents += Math.abs(row.amountCents)
  }
  const monthCount = months.size || 1
  return { ingresos: incomeCents / 100 / monthCount, gastos: expenseCents / 100 / monthCount }
}

interface RealPlanningResult {
  loading: boolean
  /** null mientras carga o si no hay sesión. */
  inputs: RealPlanningInputs | null
}

/**
 * Datos reales para Planificación: patrimonio de partida (Cuentas), tasa de
 * deuda media (Deudas) e ingresos/gastos medios mensuales (Movimientos).
 * El resto de parámetros del escenario (rentabilidad, inflación, aportación,
 * horizonte) son siempre hipótesis que elige el usuario, reales o demo.
 */
export function useRealPlanning(accounts: Account[] | null, debts: RealDebt[] | null): RealPlanningResult {
  const session = useAuthStore((s) => s.session)
  const [loading, setLoading] = useState(true)
  const [inputs, setInputs] = useState<RealPlanningInputs | null>(null)

  useEffect(() => {
    if (!supabase || !session || accounts === null || debts === null) {
      if (!supabase || !session) {
        setInputs(null)
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
      const [{ data, error }, declaredIncomeCents] = await Promise.all([
        supabase.from('transactions').select('amount_cents, credit_debit, booking_date, value_date').limit(10000),
        fetchActiveDeclaredIncomeCents(),
      ])
      if (cancelled) return
      if (error) console.error('useRealPlanning: fallo al leer transactions', error)

      const rows = (data ?? []).flatMap((tx) => {
        const dateISO = (tx.booking_date as string | null) ?? (tx.value_date as string | null)
        if (!dateISO) return []
        return [{ amountCents: tx.amount_cents as number, creditDebit: tx.credit_debit as string, dateISO }]
      })
      const { ingresos, gastos } = computeMonthlyAverages(rows)

      setInputs({
        startingNetWorth: computeStartingNetWorth(accounts ?? []),
        avgDebtRate: computeAvgDebtRate(debts ?? []),
        avgMonthlyIngresos: ingresos + declaredIncomeCents / 100,
        avgMonthlyGastos: gastos,
      })
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [session, accounts, debts])

  return { loading, inputs }
}
