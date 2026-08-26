import { useEffect, useState } from 'react'
import { isoDate } from '../../lib/budgetCalc'
import { MONTHS_ABBR } from '../../lib/format'
import { supabase } from '../../lib/supabase/client'
import { useAuthStore } from '../../lib/supabase/useAuth'
import { buildCategoryTrend, type CategoryTrendEntry, type CategoryTrendResult } from './categoryTrendCalc'

const MONTHS_BACK = 6

interface CategoryTrendHookResult {
  loading: boolean
  /** null mientras carga, sin sesión, o si no hay ningún movimiento en el periodo. */
  result: CategoryTrendResult | null
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function shortLabel(key: string): string {
  const [year, month] = key.split('-').map(Number)
  return `${MONTHS_ABBR[month - 1]} ${String(year).slice(2)}`
}

/**
 * Igual que useMonthlyTrend (últimos `MONTHS_BACK` meses cerrados), pero
 * agrupado también por categoría — usa la misma vista consciente de
 * divisiones que el informe de un mes, para que "dividir en varias
 * categorías" también se refleje aquí.
 */
export function useCategoryTrend(): CategoryTrendHookResult {
  const session = useAuthStore((s) => s.session)
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<CategoryTrendResult | null>(null)

  useEffect(() => {
    if (!supabase || !session) {
      setResult(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    async function load() {
      if (!supabase) return
      const now = new Date()
      const rangeStart = new Date(now.getFullYear(), now.getMonth() - MONTHS_BACK, 1)
      const rangeEnd = new Date(now.getFullYear(), now.getMonth(), 1)
      const fromIso = isoDate(rangeStart)
      const toIso = isoDate(rangeEnd)
      const dateFilter =
        `and(booking_date.gte.${fromIso},booking_date.lt.${toIso}),` +
        `and(booking_date.is.null,value_date.gte.${fromIso},value_date.lt.${toIso})`

      const [{ data: categories }, { data: rows }] = await Promise.all([
        supabase.from('categories').select('id, name'),
        supabase
          .from('transaction_category_amounts')
          .select('category_id, amount_cents, booking_date, value_date')
          .eq('is_internal_transfer', false)
          .or(dateFilter),
      ])
      if (cancelled) return

      const nameByCategory = new Map((categories ?? []).map((c) => [c.id as string, c.name as string]))
      const monthLabels: string[] = []
      const monthIndexByKey = new Map<string, number>()
      for (let i = 0; i < MONTHS_BACK; i++) {
        const key = monthKey(new Date(rangeStart.getFullYear(), rangeStart.getMonth() + i, 1))
        monthIndexByKey.set(key, i)
        monthLabels.push(shortLabel(key))
      }

      const entries: CategoryTrendEntry[] = (rows ?? []).flatMap((tx) => {
        const amount = tx.amount_cents as number
        if (amount >= 0) return []
        const iso = (tx.booking_date as string | null) ?? (tx.value_date as string | null)
        const monthIndex = iso ? monthIndexByKey.get(iso.slice(0, 7)) : undefined
        if (monthIndex === undefined) return []
        const categoryId = tx.category_id as string | null
        const name = categoryId ? (nameByCategory.get(categoryId) ?? 'Sin clasificar') : 'Sin clasificar'
        return [{ monthIndex, categoryId, name, spentCents: -amount }]
      })

      setResult(buildCategoryTrend(monthLabels, entries))
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [session])

  return { loading, result }
}
