import { useEffect, useState } from 'react'
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

      const [{ data: categories }, { data: txRows }, { data: prevTxRows }] = await Promise.all([
        supabase.from('categories').select('id, name'),
        supabase.from('transactions').select('category_id, amount_cents').or(dateFilter(fromIso, toIso)),
        supabase.from('transactions').select('amount_cents').or(dateFilter(prev.fromIso, prev.toIso)),
      ])
      if (cancelled) return

      const nameByCategory = new Map((categories ?? []).map((c) => [c.id as string, c.name as string]))
      const spendByCategory = new Map<string, number>()
      let incomeCents = 0
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
        spendByCategory.set(name, (spendByCategory.get(name) ?? 0) + -amount)
      }

      const prevRows = prevTxRows ?? []
      const previousExpenseCents = prevRows.length > 0 ? prevRows.reduce((sum, tx) => (((tx.amount_cents as number) < 0) ? sum - (tx.amount_cents as number) : sum), 0) : null

      const hasAnyMovement = incomeCents > 0 || expenseCents > 0
      setReport(
        hasAnyMovement
          ? buildMonthlyReport(
              formatMonthYearLong(start.getMonth(), start.getFullYear()),
              incomeCents,
              expenseCents,
              [...spendByCategory.entries()].map(([name, spentCents]) => ({ name, spentCents })),
              previousExpenseCents,
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
