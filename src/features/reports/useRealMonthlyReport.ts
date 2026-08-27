import { useEffect, useState } from 'react'
import { fetchActiveDeclaredIncomeCents } from '../../lib/declaredIncome'
import { formatMonthYearLong } from '../../lib/format'
import { countsTowardCategorySpend, expenseContribution, incomeContribution } from '../../lib/reimbursements'
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
          supabase.from('categories').select('id, name, parent_id'),
          supabase
            .from('transaction_category_amounts')
            .select('category_id, amount_cents, is_reimbursement, is_balance_adjustment')
            .eq('is_internal_transfer', false)
            .or(dateFilter(fromIso, toIso)),
          supabase
            .from('transactions')
            .select('amount_cents, is_reimbursement, is_balance_adjustment')
            .eq('is_internal_transfer', false)
            .or(dateFilter(prev.fromIso, prev.toIso)),
          supabase
            .from('transactions')
            .select('amount_cents, is_reimbursement, is_balance_adjustment')
            .eq('is_internal_transfer', false)
            .or(dateFilter(prevYear.fromIso, prevYear.toIso)),
          // Por comercio: se usa el movimiento completo, no la vista consciente de divisiones —
          // a quién le pagaste no cambia porque hayas repartido el gasto entre varias categorías.
          supabase.from('transactions').select('description, amount_cents').eq('is_internal_transfer', false).or(dateFilter(fromIso, toIso)),
          fetchActiveDeclaredIncomeCents(),
        ])
      if (cancelled) return

      const nameByCategory = new Map((categories ?? []).map((c) => [c.id as string, c.name as string]))
      const parentByCategory = new Map((categories ?? []).map((c) => [c.id as string, (c.parent_id as string | null) ?? null]))
      // El gasto de una subcategoría suma en su madre: si no, crear
      // subcategorías rompería el informe en filas pequeñas en vez de
      // explicarlo mejor. El desglose por hija se guarda aparte.
      const spendByCategory = new Map<
        string,
        { name: string; categoryId: string | null; spentCents: number; children: Map<string, { name: string; spentCents: number }> }
      >()
      let incomeCents = declaredIncomeCents
      let expenseCents = 0
      for (const row of txRows ?? []) {
        const tx = {
          amountCents: row.amount_cents as number,
          isReimbursement: Boolean(row.is_reimbursement),
          isBalanceAdjustment: Boolean(row.is_balance_adjustment),
        }
        incomeCents += incomeContribution(tx)
        expenseCents += expenseContribution(tx)
        if (!countsTowardCategorySpend(tx)) continue

        const categoryId = row.category_id as string | null
        const parentId = categoryId ? parentByCategory.get(categoryId) : null
        const rootId = parentId ?? categoryId
        const rootName = rootId ? (nameByCategory.get(rootId) ?? 'Sin clasificar') : 'Sin clasificar'
        const key = rootId ?? '__sin_clasificar__'
        const existing = spendByCategory.get(key) ?? { name: rootName, categoryId: rootId, spentCents: 0, children: new Map() }
        existing.spentCents += expenseContribution(tx)
        if (parentId && categoryId) {
          const childName = nameByCategory.get(categoryId) ?? 'Sin clasificar'
          const child = existing.children.get(categoryId) ?? { name: childName, spentCents: 0 }
          child.spentCents += expenseContribution(tx)
          existing.children.set(categoryId, child)
        }
        spendByCategory.set(key, existing)
      }

      const sumExpense = (rows: { amount_cents: unknown; is_reimbursement?: unknown; is_balance_adjustment?: unknown }[]) =>
        rows.length > 0
          ? rows.reduce(
              (sum, r) =>
                sum +
                expenseContribution({
                  amountCents: r.amount_cents as number,
                  isReimbursement: Boolean(r.is_reimbursement),
                  isBalanceAdjustment: Boolean(r.is_balance_adjustment),
                }),
              0,
            )
          : null
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
              [...spendByCategory.values()].map((c) => ({
                name: c.name,
                categoryId: c.categoryId,
                spentCents: c.spentCents,
                children: [...c.children.entries()].map(([categoryId, child]) => ({ categoryId, ...child })),
              })),
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
