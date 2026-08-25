import { useMemo } from 'react'
import type { Account } from '../../data/accounts'
import type { AttentionItem, EligibleAccount, Movement, OutsideAvailableItem, TimelineEvent } from '../../data/demo'
import { useRealAccounts } from '../accounts/useRealAccounts'
import { useRealBudget, toBudgetViewModel, type RealBudgetCategory } from '../budget/useRealBudget'
import type { RealVerdict } from '../budget/MonthVerdictCard'
import { useRealCategories } from '../transactions/useRealCategories'
import { useRealTransactions, type RealTransaction } from '../transactions/useRealTransactions'
import { useRealRecurring } from '../recurring/useRealRecurring'
import { buildRealTimeline } from './timelineCalc'

const FN_LABEL: Record<string, string> = {
  Ahorro: 'Ahorro',
  Inversión: 'Inversiones',
  Deuda: 'Deuda',
  'Activo manual': 'Activos manuales',
  'Por confirmar': 'Por confirmar',
}

export interface HomeBudgetCategoryRow {
  name: string
  budgeted: number
  spent: number
  status: string
  variant: 'success' | 'warning' | 'danger' | 'neutral'
}

export interface RealHomeData {
  loading: boolean
  today: Date
  netWorth: number
  assets: number
  liabilities: number
  eligibleAccounts: EligibleAccount[]
  eligibleAccountsSum: number
  commitments14d: number
  commitmentsLabel: string
  availableToday: number
  outsideAvailable: OutsideAvailableItem[]
  timelineEvents: TimelineEvent[]
  timelineDays: string[]
  timelineTotalOut: number
  timelineRangeLabel: string
  budgetVerdict: RealVerdict | null
  budgetCategories: HomeBudgetCategoryRow[]
  attentionItems: AttentionItem[]
  insight: { headline: string; body: string; breakdown: { label: string; delta: number }[]; total: number } | null
  recentTransactions: Movement[]
  totalTransactionsThisMonth: number
  /** (ingresos-gastos)/ingresos del mes en curso · null si aún no hay ingresos registrados este mes. */
  savingsRatePct: number | null
  monthIncome: number
  monthExpense: number
}

const STATUS_VARIANT: Record<RealBudgetCategory['status'], HomeBudgetCategoryRow['variant']> = {
  'Al día': 'success',
  'Por encima': 'warning',
  Agotado: 'danger',
  'Sin presupuesto': 'neutral',
}

function accountLabel(a: Account): string {
  return `${a.name} · ${a.institution}`
}

function eurValue(a: Account): number {
  return a.balance * ((a.sharePercent ?? 100) / 100)
}

/** null si aún no hay ingresos registrados este mes — evita fabricar una tasa a partir de 0/0. */
export function computeSavingsRate(monthIncome: number, monthExpense: number): number | null {
  if (monthIncome <= 0) return null
  return ((monthIncome - monthExpense) / monthIncome) * 100
}

function toMovement(tx: RealTransaction): Movement {
  return {
    fecha: tx.fecha,
    comercio: tx.comercio,
    categoria: tx.categoria,
    cuenta: tx.cuenta,
    estado: tx.needsReview ? 'Requiere revisión' : 'Confirmado',
    importe: tx.importe,
  }
}

/**
 * Orquesta todos los hooks reales ya construidos en fases anteriores
 * (Cuentas, Movimientos, Presupuesto, Pagos y suscripciones) y deriva de
 * ahí cada bloque de Inicio. Sin tabla propia: Inicio es un resumen de
 * datos que ya viven en otras pantallas, nunca una fuente nueva.
 */
export function useRealHome(): RealHomeData | null {
  const { loading: loadingAccounts, accounts } = useRealAccounts()
  const { categories } = useRealCategories()
  const { loading: loadingTx, transactions } = useRealTransactions(categories)
  const { loading: loadingBudget, budget } = useRealBudget(categories)
  const { loading: loadingRecurring, items: recurringItems, groups: recurringGroups } = useRealRecurring()

  const loading = loadingAccounts || loadingTx || loadingBudget || loadingRecurring

  return useMemo(() => {
    if (accounts === null) return null
    const today = new Date()

    const eurAccounts = accounts.filter((a) => a.currency === undefined || a.currency === 'EUR')
    const spendAccounts = eurAccounts.filter((a) => a.fn === 'Para gastar')
    const eligibleAccounts: EligibleAccount[] = spendAccounts.map((a) => ({ label: accountLabel(a), amount: eurValue(a) }))
    const eligibleAccountsSum = eligibleAccounts.reduce((sum, a) => sum + a.amount, 0)

    const assets = eurAccounts.reduce((sum, a) => sum + Math.max(0, eurValue(a)), 0)
    const liabilities = eurAccounts.reduce((sum, a) => sum + Math.max(0, -eurValue(a)), 0)
    const netWorth = assets - liabilities

    const outsideByFn = new Map<string, number>()
    for (const a of eurAccounts) {
      if (a.fn === 'Para gastar') continue
      outsideByFn.set(a.fn, (outsideByFn.get(a.fn) ?? 0) + eurValue(a))
    }
    const outsideAvailable: OutsideAvailableItem[] = [...outsideByFn.entries()].map(([fn, amount]) => ({
      label: FN_LABEL[fn] ?? fn,
      amount,
      pending: fn === 'Por confirmar',
    }))

    const timeline = buildRealTimeline(today, recurringGroups)
    const commitments14d = timeline.totalOut
    const availableToday = eligibleAccountsSum - commitments14d

    const budgetView = budget ? toBudgetViewModel(budget) : null
    const budgetCategories: HomeBudgetCategoryRow[] = (budgetView?.categories ?? [])
      .filter((c) => c.budgeted > 0 || c.spent > 0)
      .map((c) => ({ name: c.name, budgeted: c.budgeted, spent: c.spent, status: c.status, variant: STATUS_VARIANT[c.status] }))

    const attentionItems: AttentionItem[] = []
    const reviewCount = (transactions ?? []).filter((t) => t.needsReview).length
    if (reviewCount > 0) {
      attentionItems.push({
        status: 'Requiere revisión',
        variant: 'danger',
        headline: `${reviewCount} movimiento${reviewCount === 1 ? '' : 's'} sin categorizar`,
        detail: 'Categorízalos para que el presupuesto y los recurrentes detectados sean exactos.',
        actions: [{ label: 'Abrir Centro de revisión', primary: true, to: '/movimientos' }],
      })
    }
    for (const item of recurringItems ?? []) {
      if (!item.highlight) continue
      attentionItems.push({
        status: item.highlight.badge,
        variant: item.highlight.variant === 'info' ? 'pending' : item.highlight.variant,
        headline: item.name,
        detail: item.highlight.explanation,
        actions: [{ label: 'Ver en Pagos y suscripciones', to: '/pagos' }],
      })
    }
    const pendingAccounts = eurAccounts.filter((a) => a.fn === 'Por confirmar')
    for (const a of pendingAccounts) {
      attentionItems.push({
        status: 'Por confirmar',
        variant: 'pending',
        headline: `${a.name} aún no tiene función asignada`,
        detail: `${a.balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })} € detectados. Dile qué función tiene para que cuente en tus cifras.`,
        actions: [{ label: 'Asignar función', to: '/cuentas' }],
      })
    }
    if (timeline.events.length > 1) {
      const biggest = [...timeline.events].filter((e) => e.tier !== 'today').sort((a, b) => a.amount - b.amount)[0]
      if (biggest && biggest.amount < 0) {
        attentionItems.push({
          status: 'Pago grande a la vista',
          variant: 'danger',
          headline: `${biggest.label} carga ${Math.abs(biggest.amount).toLocaleString('es-ES', { minimumFractionDigits: 2 })} € el ${biggest.day}`,
          detail: 'Es el mayor pago detectado en los próximos 14 días. Ya está descontado de Disponible hoy.',
          actions: [{ label: 'Ver pagos y suscripciones', to: '/pagos' }],
        })
      }
    }

    const increases = (recurringItems ?? []).filter((i) => i.highlight?.badge === 'Sube de precio')
    let insight: RealHomeData['insight'] = null
    if (increases.length > 0) {
      const breakdown = increases.map((i) => {
        const match = i.highlight!.explanation.match(/(-?\d+,\d+) € más al mes/)
        const delta = match ? Number(match[1].replace(',', '.')) : 0
        return { label: `${i.name}: ${i.highlight!.explanation}`, delta }
      })
      const total = breakdown.reduce((sum, b) => sum + b.delta, 0)
      insight = {
        headline: `Tus recurrentes suben ${total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} € al mes`,
        body: `${increases.length} recurrente${increases.length === 1 ? '' : 's'} ha${increases.length === 1 ? '' : 'n'} subido de precio. ${(total * 12).toLocaleString('es-ES', { minimumFractionDigits: 2 })} € más al año si no cambia nada.`,
        breakdown,
        total,
      }
    }

    const monthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    const thisMonthTx = (transactions ?? []).filter((t) => t.dateISO?.startsWith(monthPrefix))
    const monthIncome = thisMonthTx.filter((t) => t.importe > 0).reduce((sum, t) => sum + t.importe, 0)
    const monthExpense = thisMonthTx.filter((t) => t.importe < 0).reduce((sum, t) => sum - t.importe, 0)
    const savingsRatePct = computeSavingsRate(monthIncome, monthExpense)

    const recentTransactions = (transactions ?? []).slice(0, 8).map(toMovement)

    return {
      loading,
      today,
      netWorth,
      assets,
      liabilities,
      eligibleAccounts,
      eligibleAccountsSum,
      commitments14d,
      commitmentsLabel: timeline.rangeLabel,
      availableToday,
      outsideAvailable,
      timelineEvents: timeline.events,
      timelineDays: timeline.days,
      timelineTotalOut: timeline.totalOut,
      timelineRangeLabel: timeline.rangeLabel,
      budgetVerdict: budgetView?.verdict ?? null,
      budgetCategories,
      attentionItems,
      insight,
      recentTransactions,
      totalTransactionsThisMonth: thisMonthTx.length,
      savingsRatePct,
      monthIncome,
      monthExpense,
    }
  }, [accounts, transactions, budget, recurringItems, recurringGroups, loading])
}
