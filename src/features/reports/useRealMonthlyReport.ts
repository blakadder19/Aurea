import { useEffect, useState } from 'react'
import { fetchActiveDeclaredIncomeCents } from '../../lib/declaredIncome'
import { formatMonthYearLong } from '../../lib/format'
import { supabase } from '../../lib/supabase/client'
import { useAuthStore } from '../../lib/supabase/useAuth'
import { buildMonthlyReport, type MonthlyReport } from './reportCalc'

interface RealMonthlyReportResult {
  loading: boolean
  /** null mientras carga, sin sesión, o si ese mes no tiene ningún movimiento. */
  report: MonthlyReport | null
}

function monthBounds(monthsAgo: number, from: Date) {
  const start = new Date(from.getFullYear(), from.getMonth() - monthsAgo, 1)
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { start, fromIso: iso(start), toIso: iso(end) }
}

function dateFilter(fromIso: string, toIso: string): string {
  return `and(booking_date.gte.${fromIso},booking_date.lt.${toIso}),and(booking_date.is.null,value_date.gte.${fromIso},value_date.lt.${toIso})`
}

/**
 * Informe real de un mes cerrado: ingresos, gastos, ahorro, gasto por
 * categoría y comparación con el mes anterior — calculado en vivo desde
 * transactions (sin tabla de agregados ni informe "guardado"), igual que
 * Presupuesto. `monthsAgo` = 1 es el mes cerrado más reciente.
 */
export function useRealMonthlyReport(monthsAgo: number): RealMonthlyReportResult {
  const session = useAuthStore((s) => s.session)
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState<MonthlyReport | null>(null)

  useEffect(() => {
    if (!supabase || !session) {
      setReport(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    async function load() {
      if (!supabase) return
      const now = new Date()
      const { start, fromIso, toIso } = monthBounds(monthsAgo, now)
      const prev = monthBounds(monthsAgo + 1, now)
      const prevYear = monthBounds(monthsAgo + 12, now)

      const [{ data: categories }, { data: txRows }, { data: prevTxRows }, { data: prevYearTxRows }, { data: merchantTxRows }, declaredIncomeCents] =
        await Promise.all([
          supabase.from('categories').select('id, name'),
          supabase
            .from('transaction_category_amounts')
            .select('category_id, amount_cents')
            .eq('is_internal_transfer', false)
            .or(dateFilter(fromIso, toIso)),
          supabase.from('transactions').select('amount_cents').eq('is_internal_transfer', false).or(dateFilter(prev.fromIso, prev.toIso)),
          supabase.from('transactions').select('amount_cents').eq('is_internal_transfer', false).or(dateFilter(prevYear.fromIso, prevYear.toIso)),
          // Por comercio: se usa el movimiento completo, no la vista consciente de divisiones —
          // a quién le pagaste no cambia porque hayas repartido el gasto entre varias categorías.
          supabase.from('transactions').select('description, amount_cents').eq('is_internal_transfer', false).or(dateFilter(fromIso, toIso)),
          fetchActiveDeclaredIncomeCents(),
        ])
      if (cancelled) return

      const nameByCategory = new Map((categories ?? []).map((c) => [c.id as string, c.name as string]))
      const spendByCategory = new Map<string, { name: string; categoryId: string | null; spentCents: number }>()
      let incomeCents = declaredIncomeCents
      let expenseCents = 0
      for (const tx of txRows ?? []) {
        const amount = tx.amount_cents as number
        if (amount >= 0) {
          incomeCents += amount
          continue
        }
        expenseCents += -amount
        const categoryId = tx.category_id as string | null
        const name = categoryId ? (nameByCategory.get(categoryId) ?? 'Sin clasificar') : 'Sin clasificar'
        const key = categoryId ?? '__sin_clasificar__'
        const existing = spendByCategory.get(key)
        spendByCategory.set(key, { name, categoryId, spentCents: (existing?.spentCents ?? 0) + -amount })
      }

      const sumExpense = (rows: { amount_cents: unknown }[]) =>
        rows.length > 0 ? rows.reduce((sum, tx) => (((tx.amount_cents as number) < 0) ? sum - (tx.amount_cents as number) : sum), 0) : null
      const previousExpenseCents = sumExpense(prevTxRows ?? [])
      const previousYearExpenseCents = sumExpense(prevYearTxRows ?? [])

      const spendByMerchant = new Map<string, number>()
      for (const tx of merchantTxRows ?? []) {
        const amount = tx.amount_cents as number
        if (amount >= 0) continue
        const name = ((tx.description as string | null) ?? '').trim() || 'Sin descripción'
        spendByMerchant.set(name, (spendByMerchant.get(name) ?? 0) + -amount)
      }

      const hasAnyMovement = incomeCents > 0 || expenseCents > 0
      setReport(
        hasAnyMovement
          ? buildMonthlyReport(
              formatMonthYearLong(start.getMonth(), start.getFullYear()),
              incomeCents,
              expenseCents,
              [...spendByCategory.values()],
              previousExpenseCents,
              previousYearExpenseCents,
              [...spendByMerchant.entries()].map(([name, spentCents]) => ({ name, spentCents })),
            )
          : null,
      )
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [session, monthsAgo])

  return { loading, report }
}
