import { useEffect, useState } from 'react'
import type { BudgetCategory } from '../../data/budget'
import type { BudgetStatus } from '../../lib/budgetCalc'
import { computeCategoryPace, cycleEnd, cycleStart, daysElapsedInCycle, daysInCycle, forecastCents, isoDate } from '../../lib/budgetCalc'
import { formatDayMonth, formatMonthYearLong } from '../../lib/format'
import { convertPocketSpendFifo, type PocketMovement } from '../../lib/pocketFifo'
import { countsTowardCategorySpend, expenseContribution } from '../../lib/reimbursements'
import { proposeBudgetFromHistory } from './proposeBudget'
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

/** Gasto de un pocket que FIFO no ha podido respaldar con ningún cambio. En céntimos de su propia divisa. */
export interface UncoveredPocketSpend {
  currency: string
  cents: number
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
  /**
   * Lo que se ha quedado fuera del total en euros por no tener un cambio
   * detrás. Se enseña al lado de la cifra, nunca se esconde: un total que
   * calla lo que no sabe promete más de lo que puede.
   */
  uncoveredPocketSpend: UncoveredPocketSpend[]
}

interface RealBudgetResult {
  loading: boolean
  /** null mientras carga, sin sesión, o mientras las categorías siguen cargando. */
  budget: RealBudgetSummary | null
  refetch: () => void
}

/** La divisa en la que se presupuesta: lo que esté en otra hay que convertirlo antes de sumar. */
const REPORTING_CURRENCY = 'EUR'

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

      const [{ data: budgetRows, error: budgetError }, { data: txRows, error: txError }, { data: pocketRows, error: pocketError }] =
        await Promise.all([
          supabase.from('budgets').select('category_id, amount_cents').eq('month', monthKeyForCycle(start)),
          supabase
            .from('transaction_category_amounts')
            .select('transaction_id, category_id, amount_cents, is_reimbursement, is_balance_adjustment')
            .not('category_id', 'is', null)
            .eq('is_internal_transfer', false)
            .or(dateFilter),
          // Sin filtro de fechas a propósito: FIFO necesita los cambios
          // ANTERIORES al ciclo, que son los que respaldan lo que se gastó
          // dentro. Son unas pocas decenas de filas, no una página.
          supabase
            .from('transactions')
            .select('id, account_id, currency, amount_cents, booking_date, value_date, exchange_rate, exchange_rate_unit_currency')
            .neq('currency', REPORTING_CURRENCY),
        ])
      if (cancelled) return
      if (budgetError || txError || pocketError) {
        console.error('useRealBudget: fallo al leer budgets/transactions', budgetError ?? txError ?? pocketError)
        setBudget(null)
        setLoading(false)
        return
      }

      // Lo gastado desde un pocket llega en su divisa. FIFO le pone el euro
      // que de verdad costó, cambio a cambio. Movimientos sigue enseñando la
      // cifra del banco sin tocar: aquí solo cambia lo que suma Presupuesto.
      const pockets = (pocketRows ?? []).map(
        (p): PocketMovement => ({
          id: p.id as string,
          accountId: p.account_id as string,
          currency: p.currency as string,
          amountCents: p.amount_cents as number,
          dateISO: ((p.booking_date as string | null) ?? (p.value_date as string | null)) ?? '',
          exchangeRate: p.exchange_rate as string | null,
          exchangeRateUnitCurrency: p.exchange_rate_unit_currency as string | null,
        }),
      )
      const pocketById = new Map(pockets.map((p) => [p.id, p]))
      const converted = convertPocketSpendFifo(pockets)

      const budgetedByCategory = new Map((budgetRows ?? []).map((b) => [b.category_id as string, b.amount_cents as number]))
      const spentByCategory = new Map<string, number>()
      const uncoveredByCurrency = new Map<string, number>()
      for (const row of txRows ?? []) {
        const rowCents = row.amount_cents as number
        const pocket = pocketById.get(row.transaction_id as string)

        // Un movimiento dividido aparece una vez por categoría: cada trozo se
        // lleva su parte proporcional del euro y de lo no respaldado, así la
        // suma de los trozos vuelve a dar el movimiento entero.
        const share = pocket && pocket.amountCents !== 0 ? rowCents / pocket.amountCents : 1
        const eurCents = pocket ? (converted.eurCentsById.get(pocket.id) ?? 0) * share : 0
        const uncovered = pocket ? (converted.uncoveredCentsById.get(pocket.id) ?? 0) * share : 0

        // Solo gasto: los ingresos no cuentan en el ritmo del presupuesto,
        // pero un reembolso sí — resta de lo gastado en esa categoría.
        const tx = {
          // El signo lo sigue poniendo el movimiento original; FIFO solo da magnitud.
          amountCents: pocket ? Math.sign(rowCents) * Math.round(eurCents) : rowCents,
          isReimbursement: Boolean(row.is_reimbursement),
          isBalanceAdjustment: Boolean(row.is_balance_adjustment),
        }
        // Se decide con la fila original: un gasto de 12,00 zł sin cambio
        // detrás convierte a 0 € y dejaría de parecer un gasto.
        if (!countsTowardCategorySpend({ ...tx, amountCents: rowCents })) continue

        if (pocket) {
          // Sin euro y sin descubierto anotado: FIFO no lo trató como gasto
          // (p. ej. un reembolso en divisa). No hay con qué convertirlo.
          const sinRespaldo = eurCents === 0 && uncovered === 0 ? Math.abs(rowCents) : uncovered
          if (sinRespaldo > 0) {
            uncoveredByCurrency.set(pocket.currency, (uncoveredByCurrency.get(pocket.currency) ?? 0) + sinRespaldo)
          }
        }

        const categoryId = row.category_id as string
        spentByCategory.set(categoryId, (spentByCategory.get(categoryId) ?? 0) + expenseContribution(tx))
      }

      // Las categorías de ingresos no pintan nada en un presupuesto de
      // GASTO: salían siempre como "0 € de 0 €", una fila de ruido fija.
      const realCategories: RealBudgetCategory[] = (categories ?? []).filter((c) => c.categoryGroup !== 'ingresos').map((c) => {
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
        uncoveredPocketSpend: [...uncoveredByCurrency.entries()]
          .map(([currency, cents]) => ({ currency, cents: Math.round(cents) }))
          .filter((u) => u.cents > 0)
          .sort((a, b) => b.cents - a.cents),
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
      uncovered: real.uncoveredPocketSpend,
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

/** Cuántos ciclos cerrados se miran para proponer un presupuesto. Tres da mediana sin pedir un histórico largo. */
const PROPOSAL_CYCLES = 3

/**
 * Lo que de verdad has gastado por categoría en los últimos ciclos
 * cerrados, para proponer un presupuesto de partida (ver
 * `proposeBudgetFromHistory`). Devuelve euros por categoría, ya redondeados,
 * con la misma forma que `fetchPreviousCycleBudget` — así el panel trata
 * las dos fuentes igual.
 *
 * Usa la misma vista y la misma regla de gasto que el resto de la app: los
 * traspasos entre cuentas propias no cuentan y un reembolso resta.
 */
export async function fetchProposedBudget(budgetMonthStart: number, monthOffset: number): Promise<Record<string, number>> {
  if (!supabase) return {}

  // Ciclos ya cerrados: el actual va a medias y propondría de menos.
  const cycles = Array.from({ length: PROPOSAL_CYCLES }, (_, i) => shiftedCycleStart(new Date(), budgetMonthStart, monthOffset + i + 1))
  const oldest = cycles[cycles.length - 1]
  const newestEnd = cycleEnd(cycles[0])
  const from = isoDate(oldest)
  const to = isoDate(newestEnd)

  const { data, error } = await supabase
    .from('transaction_category_amounts')
    .select('category_id, amount_cents, booking_date, value_date, is_reimbursement, is_balance_adjustment')
    .not('category_id', 'is', null)
    .eq('is_internal_transfer', false)
    .or(`and(booking_date.gte.${from},booking_date.lt.${to}),and(booking_date.is.null,value_date.gte.${from},value_date.lt.${to})`)
  if (error || !data) {
    console.error('fetchProposedBudget: fallo al leer el histórico', error)
    return {}
  }

  // Un cubo por ciclo y categoría: la propuesta es la mediana entre ciclos,
  // así que hace falta el reparto por mes, no el total.
  const cycleStarts = [...cycles].reverse().map(isoDate)
  const byCategory = new Map<string, number[]>()
  for (const row of data) {
    const tx = {
      amountCents: row.amount_cents as number,
      isReimbursement: Boolean(row.is_reimbursement),
      isBalanceAdjustment: Boolean(row.is_balance_adjustment),
    }
    if (!countsTowardCategorySpend(tx)) continue
    const iso = (row.booking_date as string | null) ?? (row.value_date as string | null)
    if (!iso) continue
    // El ciclo al que pertenece: el último inicio de ciclo que no lo supera.
    const index = cycleStarts.findLastIndex((start) => iso >= start)
    if (index === -1) continue
    const categoryId = row.category_id as string
    const buckets = byCategory.get(categoryId) ?? Array.from({ length: PROPOSAL_CYCLES }, () => 0)
    buckets[index] += expenseContribution(tx)
    byCategory.set(categoryId, buckets)
  }

  const proposal = proposeBudgetFromHistory([...byCategory.entries()].map(([categoryId, spentCentsByMonth]) => ({ categoryId, spentCentsByMonth })))
  return Object.fromEntries(Object.entries(proposal).map(([categoryId, cents]) => [categoryId, Math.round(cents / 100)]))
}
