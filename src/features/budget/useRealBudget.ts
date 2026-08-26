import { useEffect, useState } from 'react'
import type { BudgetCategory } from '../../data/budget'
import type { BudgetStatus } from '../../lib/budgetCalc'
import { computeCategoryPace, cycleEnd, cycleStart, daysElapsedInCycle, daysInCycle, forecastCents, isoDate } from '../../lib/budgetCalc'
import { formatDayMonth, formatMonthYearLong } from '../../lib/format'
import { supabase } from '../../lib/supabase/client'
import { useAuthStore } from '../../lib/supabase/useAuth'
import { categoryLabel, type RealCategory } from '../transactions/useRealCategories'
import type { RealVerdict } from './MonthVerdictCard'

export interface RealBudgetCategory {
  categoryId: string
  name: string
  categoryGroup: string
  budgetedCents: number
  spentCents: number
  remainingCents: number
  expectedPaceCents: number | null
  paceDeltaCents: number | null
  status: BudgetStatus
}

export interface RealBudgetSummary {
  monthLabel: string
  dayOfMonth: number
  daysInMonthCount: number
  totalBudgetedCents: number
  totalSpentCents: number
  totalRemainingCents: number
  forecastCents: number
  paceDeltaCents: number | null
  categories: RealBudgetCategory[]
}

interface RealBudgetResult {
  loading: boolean
  /** null mientras carga, sin sesión, o mientras las categorías siguen cargando. */
  budget: RealBudgetSummary | null
  refetch: () => void
}

/** Primer día del mes calendario en que empieza el ciclo — clave de almacenamiento en `budgets.month` (la tabla exige que sea día 1). */
function monthKeyForCycle(start: Date): string {
  return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-01`
}

/**
 * El ciclo que empieza `monthOffset` ciclos antes (positivo) o después
 * (negativo) del que contiene `today` — desplazando por meses de
 * calendario sobre el propio `startDay` del ciclo actual, nunca sobre el
 * día de `today`, así nunca hay problema de desbordamiento de mes (28-31).
 */
function shiftedCycleStart(today: Date, startDay: number, monthOffset: number): Date {
  const current = cycleStart(today, startDay)
  return new Date(current.getFullYear(), current.getMonth() - monthOffset, current.getDate())
}

/** "agosto de 2026" si el ciclo empieza el día 1 (de siempre); si no, el rango real del ciclo ("25 ago – 24 sep"). */
function cycleLabel(start: Date, end: Date, startDay: number): string {
  if (startDay === 1) return formatMonthYearLong(start.getMonth(), start.getFullYear())
  const lastDay = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1)
  return `${formatDayMonth(start.getDate(), start.getMonth())} – ${formatDayMonth(lastDay.getDate(), lastDay.getMonth())}`
}

/**
 * Presupuesto real del ciclo en curso: gasto por categoría calculado en
 * vivo desde transactions (sin tabla de agregados), cruzado con los
 * límites que el usuario haya guardado en budgets. El ciclo empieza el
 * día 1 por defecto, o el día que el usuario haya elegido en Ajustes
 * básicos (budgetMonthStart) — mismo patrón que useRealTransactions.
 * budgetMonthStart es null mientras ese ajuste real todavía no se sabe
 * (Ajustes cargando): en ese caso no se consulta nada todavía, para no
 * calcular el ritmo del mes con el día 1 por defecto y luego "saltar" al
 * ciclo real un instante después.
 */
export function useRealBudget(categories: RealCategory[] | null, budgetMonthStart: number | null, monthOffset = 0): RealBudgetResult {
  const session = useAuthStore((s) => s.session)
  const [loading, setLoading] = useState(true)
  const [budget, setBudget] = useState<RealBudgetSummary | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!supabase || !session || categories === null || budgetMonthStart === null) {
      if (!supabase || !session) {
        setBudget(null)
        setLoading(false)
      }
      return
    }

    let cancelled = false
    setLoading(true)
    const monthStart = budgetMonthStart

    async function load() {
      if (!supabase) return
      const now = new Date()
      const start = shiftedCycleStart(now, monthStart, monthOffset)
      const end = cycleEnd(start)
      const from = isoDate(start)
      const to = isoDate(end)
      const totalDays = daysInCycle(start)
      // Fuera del ciclo en curso no hay "días transcurridos" que valga: un mes
      // pasado se trata como cerrado (100 %) y uno futuro, como si ya hubiera
      // pasado entero — así "ritmo" se convierte en la comparación real
      // presupuestado-vs-gastado, sin fabricar un porcentaje de tiempo.
      const daysElapsed = monthOffset === 0 ? daysElapsedInCycle(now, start) : totalDays

      const dateFilter =
        `and(booking_date.gte.${from},booking_date.lt.${to}),` +
        `and(booking_date.is.null,value_date.gte.${from},value_date.lt.${to})`

      const [{ data: budgetRows, error: budgetError }, { data: txRows, error: txError }] = await Promise.all([
        supabase.from('budgets').select('category_id, amount_cents').eq('month', monthKeyForCycle(start)),
        supabase
          .from('transaction_category_amounts')
          .select('category_id, amount_cents')
          .not('category_id', 'is', null)
          .eq('is_internal_transfer', false)
          .or(dateFilter),
      ])
      if (cancelled) return
      if (budgetError || txError) {
        console.error('useRealBudget: fallo al leer budgets/transactions', budgetError ?? txError)
        setBudget(null)
        setLoading(false)
        return
      }

      const budgetedByCategory = new Map((budgetRows ?? []).map((b) => [b.category_id as string, b.amount_cents as number]))
      const spentByCategory = new Map<string, number>()
      for (const tx of txRows ?? []) {
        const amount = tx.amount_cents as number
        if (amount >= 0) continue // solo gasto: los ingresos no cuentan en el ritmo del presupuesto.
        const categoryId = tx.category_id as string
        spentByCategory.set(categoryId, (spentByCategory.get(categoryId) ?? 0) - amount)
      }

      const realCategories: RealBudgetCategory[] = (categories ?? []).map((c) => {
        const budgetedCents = budgetedByCategory.get(c.id) ?? 0
        const spentCents = spentByCategory.get(c.id) ?? 0
        const pace = computeCategoryPace(budgetedCents, spentCents, daysElapsed, totalDays)
        return { categoryId: c.id, name: categoryLabel(c), categoryGroup: c.categoryGroup, ...pace }
      })

      const totalBudgetedCents = realCategories.reduce((sum, c) => sum + c.budgetedCents, 0)
      const totalSpentCents = realCategories.reduce((sum, c) => sum + c.spentCents, 0)
      const totalPace = computeCategoryPace(totalBudgetedCents, totalSpentCents, daysElapsed, totalDays)

      setBudget({
        monthLabel: cycleLabel(start, end, monthStart),
        dayOfMonth: daysElapsed,
        daysInMonthCount: totalDays,
        totalBudgetedCents,
        totalSpentCents,
        totalRemainingCents: totalPace.remainingCents,
        forecastCents: forecastCents(totalSpentCents, daysElapsed, totalDays),
        paceDeltaCents: totalPace.paceDeltaCents,
        categories: realCategories,
      })
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [session, categories, budgetMonthStart, monthOffset, version])

  return { loading, budget, refetch: () => setVersion((v) => v + 1) }
}

/**
 * Lee los importes presupuestados del ciclo justo anterior al que se está
 * viendo (`monthOffset + 1`) — para el botón "Copiar del mes anterior".
 * Solo lectura: no guarda nada, el usuario aún tiene que pulsar "Guardar
 * cambios" en el formulario.
 */
export async function fetchPreviousCycleBudget(budgetMonthStart: number, monthOffset: number): Promise<Record<string, number>> {
  if (!supabase) return {}
  const previousStart = shiftedCycleStart(new Date(), budgetMonthStart, monthOffset + 1)
  const { data, error } = await supabase.from('budgets').select('category_id, amount_cents').eq('month', monthKeyForCycle(previousStart))
  if (error || !data) {
    console.error('fetchPreviousCycleBudget: fallo al leer', error)
    return {}
  }
  return Object.fromEntries(data.map((b) => [b.category_id as string, Math.round((b.amount_cents as number) / 100)]))
}

/** Guarda el presupuesto de una categoría para el ciclo mostrado (upsert) — `monthOffset` igual que en useRealBudget. RLS asegura que solo toca lo suyo. */
export async function saveCategoryBudget(
  categoryId: string,
  amountCents: number,
  budgetMonthStart: number,
  monthOffset = 0,
): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'
  if (!Number.isInteger(amountCents) || amountCents < 0) return 'El importe debe ser un número entero mayor o igual que 0.'

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 'Inicia sesión de nuevo para guardar el presupuesto.'

  const month = monthKeyForCycle(shiftedCycleStart(new Date(), budgetMonthStart, monthOffset))
  const { error } = await supabase
    .from('budgets')
    .upsert({ user_id: user.id, category_id: categoryId, month, amount_cents: amountCents }, { onConflict: 'user_id,category_id,month' })
  if (error) {
    console.error('saveCategoryBudget: fallo al guardar', error)
    return 'No hemos podido guardar el presupuesto. Inténtalo de nuevo.'
  }
  return null
}

const euros = (cents: number) => Math.round(cents / 100)

function categoryDetail(c: RealBudgetCategory): string {
  if (c.budgetedCents === 0) return 'Aún no le has puesto presupuesto a esta categoría.'
  if (c.expectedPaceCents === null || c.paceDeltaCents === null) return ''
  const deltaEur = euros(Math.abs(c.paceDeltaCents))
  const pct = Math.round((c.expectedPaceCents / c.budgetedCents) * 100)
  return c.paceDeltaCents > 0
    ? `Ritmo esperado hoy: ${pct} %. Vas ${deltaEur} € por encima del ritmo.`
    : `Ritmo esperado hoy: ${pct} %. Vas ${deltaEur} € por debajo del ritmo.`
}

/** Convierte el resumen real (céntimos) a la misma forma (euros) que ya consumen MonthVerdictCard/CategoryList. */
export function toBudgetViewModel(real: RealBudgetSummary): { verdict: RealVerdict; categories: BudgetCategory[] } {
  const { totalBudgetedCents, totalSpentCents, paceDeltaCents } = real

  let headline: string
  let badgeLabel: string
  let badgeVariant: RealVerdict['badgeVariant']
  if (totalBudgetedCents === 0) {
    headline = 'Aún no has puesto presupuesto este mes'
    badgeLabel = 'Sin presupuesto'
    badgeVariant = 'neutral'
  } else if (paceDeltaCents !== null && paceDeltaCents > 0) {
    headline = `Vas ${euros(paceDeltaCents)} € por encima del ritmo previsto`
    badgeLabel = 'Por encima'
    badgeVariant = 'warning'
  } else {
    headline = 'Vas al ritmo previsto'
    badgeLabel = 'Al día'
    badgeVariant = 'success'
  }

  const paceRealPct = totalBudgetedCents > 0 ? (totalSpentCents / totalBudgetedCents) * 100 : null
  const paceExpectedPct =
    totalBudgetedCents > 0 ? (real.categories.reduce((s, c) => s + (c.expectedPaceCents ?? 0), 0) / totalBudgetedCents) * 100 : null

  return {
    verdict: {
      headline,
      badgeLabel,
      badgeVariant,
      paceRealPct,
      paceExpectedPct,
      presupuestado: euros(totalBudgetedCents),
      gastado: euros(totalSpentCents),
      restante: euros(real.totalRemainingCents),
      previsionCierre: euros(real.forecastCents),
    },
    categories: real.categories.map((c) => ({
      id: c.categoryId,
      name: c.name,
      group: c.categoryGroup,
      budgeted: euros(c.budgetedCents),
      spent: euros(c.spentCents),
      status: c.status,
      detail: categoryDetail(c),
    })),
  }
}
