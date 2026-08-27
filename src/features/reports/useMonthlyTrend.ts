import { useEffect, useState } from 'react'
import { isoDate } from '../../lib/budgetCalc'
import { fetchActiveDeclaredIncomeCents } from '../../lib/declaredIncome'
import { MONTHS_ABBR } from '../../lib/format'
import { expenseContribution, incomeContribution } from '../../lib/reimbursements'
import { supabase } from '../../lib/supabase/client'
import { useAuthStore } from '../../lib/supabase/useAuth'
import { buildMonthlyTrend, type MonthlyTrendPoint } from './reportCalc'

const MONTHS_BACK = 6

interface MonthlyTrendResult {
  loading: boolean
  /** null mientras carga, sin sesión, o si no hay ningún movimiento en el periodo. */
  points: MonthlyTrendPoint[] | null
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** "ago 26" a partir de una clave "2026-08". */
function shortLabel(key: string): string {
  const [year, month] = key.split('-').map(Number)
  return `${MONTHS_ABBR[month - 1]} ${String(year).slice(2)}`
}

/**
 * Ingresos/gastos de los últimos `MONTHS_BACK` meses cerrados en una sola
 * consulta (a diferencia de useRealMonthlyReport, que trae el detalle por
 * categoría de un único mes) — para MonthlyTrendChart, un vistazo de varios
 * meses en vez de tener que ir cambiando el selector uno a uno.
 */
export function useMonthlyTrend(): MonthlyTrendResult {
  const session = useAuthStore((s) => s.session)
  const [loading, setLoading] = useState(true)
  const [points, setPoints] = useState<MonthlyTrendPoint[] | null>(null)

  useEffect(() => {
    if (!supabase || !session) {
      setPoints(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    async function load() {
      if (!supabase) return
      const now = new Date()
      // Mes en curso excluido a propósito: igual que el informe de un mes, solo mira meses ya cerrados.
      const rangeStart = new Date(now.getFullYear(), now.getMonth() - MONTHS_BACK, 1)
      const rangeEnd = new Date(now.getFullYear(), now.getMonth(), 1)
      const fromIso = isoDate(rangeStart)
      const toIso = isoDate(rangeEnd)
      const dateFilter =
        `and(booking_date.gte.${fromIso},booking_date.lt.${toIso}),` +
        `and(booking_date.is.null,value_date.gte.${fromIso},value_date.lt.${toIso})`

      const [{ data: txRows, error }, declaredIncomeCents] = await Promise.all([
        supabase
          .from('transactions')
          .select('amount_cents, booking_date, value_date, is_reimbursement, is_balance_adjustment')
          .eq('is_internal_transfer', false)
          .or(dateFilter),
        fetchActiveDeclaredIncomeCents(),
      ])
      if (cancelled) return
      if (error) {
        console.error('useMonthlyTrend: fallo al leer transactions', error)
        setPoints(null)
        setLoading(false)
        return
      }

      const buckets = new Map<string, { incomeCents: number; expenseCents: number }>()
      for (let i = 0; i < MONTHS_BACK; i++) {
        buckets.set(monthKey(new Date(rangeStart.getFullYear(), rangeStart.getMonth() + i, 1)), {
          incomeCents: declaredIncomeCents,
          expenseCents: 0,
        })
      }

      for (const row of txRows ?? []) {
        const iso = (row.booking_date as string | null) ?? (row.value_date as string | null)
        const bucket = iso ? buckets.get(iso.slice(0, 7)) : undefined
        if (!bucket) continue
        const tx = {
          amountCents: row.amount_cents as number,
          isReimbursement: Boolean(row.is_reimbursement),
          isBalanceAdjustment: Boolean(row.is_balance_adjustment),
        }
        bucket.incomeCents += incomeContribution(tx)
        bucket.expenseCents += expenseContribution(tx)
      }

      const months = [...buckets.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, v]) => ({ monthLabel: shortLabel(key), ...v }))
      setPoints(buildMonthlyTrend(months))
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [session])

  return { loading, points }
}
