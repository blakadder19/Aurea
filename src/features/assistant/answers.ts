import type { BadgeVariant } from '../../components/Badge'
import { formatMoney, formatMoneySigned } from '../../lib/format'
import { CONTEXT_DATE, availableToday, insight } from '../../data/demo'
import { budgetCategories } from '../../data/budget'
import { debts } from '../../data/debts'
import { emergencyFund } from '../../data/goals'
import { goalForecast, formatMonthYear } from '../goals/domain'
import { simulateExtraPayment, formatDuration, formatMonthYearShort } from '../debts/domain'

export interface AnswerBadge {
  variant: BadgeVariant
  label: string
}

export interface Answer {
  id: string
  question: string
  badge: AnswerBadge
  headline: string
  body: string
  calculation: string
  recommendation?: { badge: AnswerBadge; text: string }
  linkTo: string
  linkLabel: string
  nextActionTo: string
  nextActionLabel: string
}

function buildViajeAnswer(): Answer {
  const remaining = availableToday - 1200
  return {
    id: 'viaje',
    question: '¿Puedo permitirme un viaje de 1.200 €?',
    badge: { variant: 'neutral', label: 'Hecho' },
    headline: `Sí, con ${formatMoney(remaining)} libres después`,
    body: 'Tu Disponible hoy es lo que tienes en cuentas para gastar, menos los pagos que ya sabes que llegan en 14 días. Un viaje de 1.200 € te deja margen de sobra.',
    calculation: `Cálculo: ${formatMoney(availableToday)} Disponible hoy − 1.200 € del viaje = ${formatMoney(remaining)}.`,
    linkTo: '/',
    linkLabel: 'Ver el desglose en Inicio',
    nextActionTo: '/presupuesto',
    nextActionLabel: 'Siguiente: ajustar el presupuesto del mes',
  }
}

function buildGastoMayorAnswer(): Answer {
  const restaurantes = budgetCategories.find((c) => c.id === 'restaurantes')!
  const remainingBudget = restaurantes.budgeted - restaurantes.spent
  return {
    id: 'gasto-mayor',
    question: '¿En qué se me va más dinero que el mes pasado?',
    badge: { variant: 'warning', label: 'Estimación' },
    headline: `${formatMoneySigned(insight.total, 0)} sobre lo previsto este mes`,
    body: insight.body,
    calculation: `Cálculo: Restaurantes ${formatMoney(restaurantes.spent, 0)} en 19 días → ritmo ${formatMoney(509, 0)}/mes (${formatMoneySigned(109, 0)} sobre los ${formatMoney(restaurantes.budgeted, 0)} previstos). Transporte 96 € frente a 60 € previstos (+36 €).`,
    recommendation: {
      badge: { variant: 'success', label: 'Recomendación' },
      text: `Si limitas los próximos 12 días de restaurantes a ${formatMoney(remainingBudget, 0)} (dos salidas menos), cierras el mes dentro del presupuesto.`,
    },
    linkTo: '/presupuesto',
    linkLabel: 'Ver la categoría en Presupuesto',
    nextActionTo: '/presupuesto',
    nextActionLabel: 'Siguiente: ajustar el presupuesto de Restaurantes',
  }
}

function buildColchonAnswer(): Answer {
  const forecast = goalForecast(emergencyFund.saved, emergencyFund.target, emergencyFund.monthlyContribution, CONTEXT_DATE)
  const dateLabel = forecast.projectedDate ? formatMonthYear(forecast.projectedDate) : 'una fecha indefinida'
  return {
    id: 'colchon',
    question: '¿Cuándo llego a los 6 meses de colchón?',
    badge: { variant: 'warning', label: 'Estimación' },
    headline: `Sobre ${dateLabel}`,
    body: `Llevas ${formatMoney(emergencyFund.saved, 0)} de los ${formatMoney(emergencyFund.target, 0)} que necesitas para ${emergencyFund.targetMonths} meses de gastos esenciales (${formatMoney(emergencyFund.monthlyEssentialSpend, 0)}/mes). Aportando ${formatMoney(emergencyFund.monthlyContribution, 0)}/mes, llegas en ${dateLabel}.`,
    calculation: `Cálculo: (${formatMoney(emergencyFund.target, 0)} − ${formatMoney(emergencyFund.saved, 0)}) ÷ ${formatMoney(emergencyFund.monthlyContribution, 0)}/mes = ${forecast.monthsToGoal} meses desde el 19 ago 2026.`,
    linkTo: '/objetivos',
    linkLabel: 'Ver el fondo de emergencia en Objetivos',
    nextActionTo: '/objetivos',
    nextActionLabel: 'Siguiente: subir la aportación mensual',
  }
}

const CAR_EXTRA_PAYMENT = 1500

function buildAmortizarCocheAnswer(): Answer {
  const coche = debts.find((d) => d.id === 'coche')!
  const result = simulateExtraPayment(coche.balance, coche.annualRate, coche.monthlyPayment!, CAR_EXTRA_PAYMENT, CONTEXT_DATE)
  const newDateLabel = result.newPayoffDate ? formatMonthYearShort(result.newPayoffDate) : 'indefinida'
  const ratePct = (coche.annualRate * 100).toLocaleString('es-ES', { minimumFractionDigits: 2 })
  return {
    id: 'amortizar-coche',
    question: '¿Me conviene amortizar el coche?',
    badge: { variant: 'success', label: 'Recomendación' },
    headline: `Ahorrarías ${formatMoney(Math.max(0, result.interestSaved))} en intereses`,
    body: `Amortizar ${formatMoney(CAR_EXTRA_PAYMENT, 0)} ahora adelanta el fin del préstamo del coche ${formatDuration(result.monthsSaved)} (nueva fecha: ${newDateLabel}). Compáralo con lo que ganarías invirtiendo esos ${formatMoney(CAR_EXTRA_PAYMENT, 0)} a más del ${ratePct} % anual, el tipo de este préstamo.`,
    calculation: `Cálculo: con la cuota actual, el préstamo termina en ${formatDuration(result.monthsBefore)}; amortizando ${formatMoney(CAR_EXTRA_PAYMENT, 0)} termina en ${formatDuration(result.monthsAfter)}.`,
    linkTo: '/deudas',
    linkLabel: 'Simular en Deudas',
    nextActionTo: '/deudas',
    nextActionLabel: 'Siguiente: abrir el simulador de pago extraordinario',
  }
}

export function buildAnswers(): Answer[] {
  return [buildViajeAnswer(), buildGastoMayorAnswer(), buildColchonAnswer(), buildAmortizarCocheAnswer()]
}

export const SUGGESTED_QUESTIONS: { id: string; question: string }[] = [
  { id: 'viaje', question: '¿Puedo permitirme un viaje de 1.200 €?' },
  { id: 'gasto-mayor', question: '¿En qué se me va más dinero que el mes pasado?' },
  { id: 'colchon', question: '¿Cuándo llego a los 6 meses de colchón?' },
  { id: 'amortizar-coche', question: '¿Me conviene amortizar el coche?' },
]
