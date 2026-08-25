import { useMemo } from 'react'
import { formatMoney, formatMoneySigned } from '../../lib/format'
import { useRealAccounts } from '../accounts/useRealAccounts'
import { useRealBudget } from '../budget/useRealBudget'
import { simulateExtraPayment, formatDuration, formatMonthYearShort } from '../debts/domain'
import { useRealDebts } from '../debts/useRealDebts'
import { goalForecast, formatMonthYear } from '../goals/domain'
import { useRealGoals } from '../goals/useRealGoals'
import { useRealCategories } from '../transactions/useRealCategories'
import { useRealHome } from '../home/useRealHome'
import type { Answer } from './answers'

const euros = (cents: number) => cents / 100

/** Cuánto simular amortizar: lo que hoy tienes disponible sin tocar ahorro, redondeado. No se fabrica una cifra arbitraria. */
export function extraPaymentFrom(availableToday: number): number {
  return Math.max(0, Math.round(availableToday))
}

export function buildViajeAnswer(availableToday: number): Answer {
  const remaining = availableToday - 1200
  return {
    id: 'viaje',
    question: '¿Puedo permitirme un viaje de 1.200 €?',
    badge: { variant: 'neutral', label: 'Hecho' },
    headline: remaining >= 0 ? `Sí, con ${formatMoney(remaining)} libres después` : `No sin tocar tu ahorro: te faltarían ${formatMoney(-remaining)}`,
    body: 'Tu Disponible hoy es lo que tienes en cuentas para gastar, menos los pagos que ya sabes que llegan en 14 días.',
    calculation: `Cálculo: ${formatMoney(availableToday)} Disponible hoy − 1.200 € del viaje = ${formatMoney(remaining)}.`,
    linkTo: '/',
    linkLabel: 'Ver el desglose en Inicio',
    nextActionTo: '/presupuesto',
    nextActionLabel: 'Siguiente: ajustar el presupuesto del mes',
  }
}

interface OverspendCategory {
  name: string
  spentCents: number
  budgetedCents: number
  paceDeltaCents: number
}

interface BudgetCategoryLike {
  name: string
  spentCents: number
  budgetedCents: number
  paceDeltaCents: number | null
}

/** La categoría con presupuesto puesto que más se desvía por encima del ritmo esperado, o null si ninguna se desvía. */
export function pickWorstCategory(categories: BudgetCategoryLike[]): OverspendCategory | null {
  const worst = categories
    .filter((c) => c.budgetedCents > 0 && c.paceDeltaCents !== null && c.paceDeltaCents > 0)
    .sort((a, b) => (b.paceDeltaCents ?? 0) - (a.paceDeltaCents ?? 0))[0]
  if (!worst) return null
  return { name: worst.name, spentCents: worst.spentCents, budgetedCents: worst.budgetedCents, paceDeltaCents: worst.paceDeltaCents! }
}

interface DebtLike {
  name: string
  balanceCents: number
  annualRateBps: number
  monthlyPaymentCents: number | null
}

/** Primera deuda real con cuota mensual fijada — sobre esa se puede simular una amortización con sentido. */
export function pickPayableDebt(debts: DebtLike[]): DebtLike | null {
  return debts.find((d) => d.monthlyPaymentCents !== null && d.monthlyPaymentCents > 0) ?? null
}

export function buildGastoMayorAnswer(worst: OverspendCategory | null): Answer {
  if (!worst) {
    return {
      id: 'gasto-mayor',
      question: '¿En qué se me va más dinero de lo previsto este mes?',
      badge: { variant: 'success', label: 'Al día' },
      headline: 'Ninguna categoría va por encima del ritmo esperado',
      body: 'Con lo que llevas gastado este mes en cada categoría con presupuesto, ninguna supera el ritmo que le tocaría a estas alturas del mes.',
      calculation: 'Cálculo: ritmo real de cada categoría (gastado ÷ días transcurridos × días del mes) frente a su presupuesto — ninguna lo supera.',
      linkTo: '/presupuesto',
      linkLabel: 'Ver el desglose en Presupuesto',
      nextActionTo: '/presupuesto',
      nextActionLabel: 'Siguiente: revisar el presupuesto del mes',
    }
  }
  const overBy = euros(worst.paceDeltaCents)
  return {
    id: 'gasto-mayor',
    question: '¿En qué se me va más dinero de lo previsto este mes?',
    badge: { variant: 'warning', label: 'Estimación' },
    headline: `${worst.name}: ${formatMoneySigned(overBy, 0)} sobre el ritmo previsto`,
    body: `De tus categorías con presupuesto puesto, ${worst.name} es la que más se desvía del ritmo esperado a estas alturas del mes.`,
    calculation: `Cálculo: ${worst.name} lleva ${formatMoney(euros(worst.spentCents), 0)} gastados de ${formatMoney(euros(worst.budgetedCents), 0)} presupuestados, ${formatMoneySigned(overBy, 0)} por encima de lo que tocaría a día de hoy.`,
    linkTo: '/presupuesto',
    linkLabel: 'Ver la categoría en Presupuesto',
    nextActionTo: '/presupuesto',
    nextActionLabel: `Siguiente: ajustar el presupuesto de ${worst.name}`,
  }
}

interface GoalInput {
  name: string
  saved: number
  target: number
  monthlyContribution: number
}

export function buildObjetivoAnswer(goal: GoalInput): Answer {
  const forecast = goalForecast(goal.saved, goal.target, goal.monthlyContribution, new Date())
  const dateLabel = forecast.projectedDate ? formatMonthYear(forecast.projectedDate) : 'una fecha indefinida (sin aportación mensual)'
  return {
    id: 'objetivo',
    question: `¿Cuándo llego a mi objetivo «${goal.name}»?`,
    badge: { variant: 'warning', label: 'Estimación' },
    headline: `Sobre ${dateLabel}`,
    body: `Llevas ${formatMoney(goal.saved, 0)} de los ${formatMoney(goal.target, 0)} de «${goal.name}». Aportando ${formatMoney(goal.monthlyContribution, 0)}/mes, llegas en ${dateLabel}.`,
    calculation: Number.isFinite(forecast.monthsToGoal)
      ? `Cálculo: (${formatMoney(goal.target, 0)} − ${formatMoney(goal.saved, 0)}) ÷ ${formatMoney(goal.monthlyContribution, 0)}/mes = ${forecast.monthsToGoal} meses desde hoy.`
      : 'Cálculo: sin aportación mensual no hay meses que contar.',
    linkTo: '/objetivos',
    linkLabel: `Ver «${goal.name}» en Objetivos`,
    nextActionTo: '/objetivos',
    nextActionLabel: 'Siguiente: registrar una aportación',
  }
}

interface DebtInput {
  name: string
  balance: number
  annualRate: number
  monthlyPayment: number
}

export function buildAmortizarAnswer(debt: DebtInput, extra: number): Answer {
  const result = simulateExtraPayment(debt.balance, debt.annualRate, debt.monthlyPayment, extra, new Date())
  const newDateLabel = result.newPayoffDate ? formatMonthYearShort(result.newPayoffDate) : 'indefinida'
  const ratePct = (debt.annualRate * 100).toLocaleString('es-ES', { minimumFractionDigits: 2 })
  return {
    id: 'amortizar',
    question: `¿Me conviene amortizar «${debt.name}»?`,
    badge: { variant: result.interestSaved > 0 ? 'success' : 'neutral', label: result.interestSaved > 0 ? 'Recomendación' : 'Estimación' },
    headline:
      result.interestSaved > 0
        ? `Ahorrarías ${formatMoney(result.interestSaved)} en intereses`
        : 'Apenas cambia el total de intereses',
    body: `Usar tu Disponible hoy (${formatMoney(extra, 0)}) para amortizar «${debt.name}» ${result.monthsSaved > 0 ? `adelanta el fin del préstamo ${formatDuration(result.monthsSaved)} (nueva fecha: ${newDateLabel})` : 'no cambia la fecha de fin'}. Compáralo con lo que ganarías invirtiendo esa cantidad a más del ${ratePct} % anual, el tipo de esta deuda.`,
    calculation: `Cálculo: con la cuota actual, la deuda termina en ${formatDuration(result.monthsBefore)}; amortizando ${formatMoney(extra, 0)} termina en ${formatDuration(result.monthsAfter)}.`,
    linkTo: '/deudas',
    linkLabel: 'Simular en Deudas',
    nextActionTo: '/deudas',
    nextActionLabel: 'Siguiente: abrir el simulador de pago extraordinario',
  }
}

interface RealAnswersResult {
  loading: boolean
  /** null mientras carga o si no hay sesión. */
  answers: Answer[] | null
}

/**
 * Mismas cuatro preguntas que la demo, pero calculadas de verdad sobre
 * datos reales — nunca sobre un LLM: cada respuesta es una función pura
 * que ya usan otras pantallas (Inicio, Presupuesto, Objetivos, Deudas).
 * Objetivo/Deuda solo aparecen si el usuario tiene al menos uno real; el
 * campo libre sigue sin responder nada, real o demo (ver FreeformQuestion).
 */
export function useRealAnswers(): RealAnswersResult {
  const home = useRealHome()
  const { categories } = useRealCategories()
  const { loading: loadingBudget, budget } = useRealBudget(categories)
  const { loading: loadingGoals, goals } = useRealGoals()
  const { loading: loadingAccounts, accounts } = useRealAccounts()
  const { loading: loadingDebts, debts } = useRealDebts(accounts)

  const loading = loadingBudget || loadingGoals || loadingAccounts || loadingDebts

  return useMemo(() => {
    if (home === null) return { loading, answers: null }

    const answers: Answer[] = [buildViajeAnswer(home.availableToday)]

    const worst = pickWorstCategory(budget?.categories ?? [])
    answers.push(buildGastoMayorAnswer(worst))

    const goal = goals?.[0]
    if (goal) {
      answers.push(
        buildObjetivoAnswer({
          name: goal.name,
          saved: euros(goal.savedCents),
          target: euros(goal.targetCents),
          monthlyContribution: euros(goal.monthlyContributionCents),
        }),
      )
    }

    const debt = pickPayableDebt(debts ?? [])
    const extra = extraPaymentFrom(home.availableToday)
    if (debt && extra > 0) {
      answers.push(
        buildAmortizarAnswer(
          {
            name: debt.name,
            balance: euros(debt.balanceCents),
            annualRate: debt.annualRateBps / 10000,
            monthlyPayment: euros(debt.monthlyPaymentCents!),
          },
          extra,
        ),
      )
    }

    return { loading, answers }
  }, [home, budget, goals, debts, loading])
}
