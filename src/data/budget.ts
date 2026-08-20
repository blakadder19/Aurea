/**
 * Datos ficticios de Presupuesto — agosto de 2026, día 19 de 31.
 * Tomados literalmente de build_aurea_presupuesto/README.md; cuadran con los cortes 1 y 2.
 */

export const budgetSummary = {
  headline: 'Vas 145 € por encima del ritmo previsto',
  monthLabel: 'agosto de 2026',
  dayOfMonth: 19,
  daysInMonth: 31,
  spent: 1612,
  committed: 288,
  forecast: 2545,
  paceReal: 67,
  paceExpected: 61,
}

export type CategoryStatus = 'Al día' | 'Por encima' | 'Agotado'

export interface BudgetCategory {
  id: string
  name: string
  budgeted: number
  spent: number
  status: CategoryStatus
  detail: string
}

export const budgetCategories: BudgetCategory[] = [
  {
    id: 'supermercado',
    name: 'Supermercado',
    budgeted: 480,
    spent: 312,
    status: 'Al día',
    detail: 'Ritmo esperado al día 19: 62 %. Vas alineada.',
  },
  {
    id: 'restaurantes',
    name: 'Restaurantes',
    budgeted: 400,
    spent: 312,
    status: 'Por encima',
    detail: 'Ritmo esperado 62 %, vas al 78 %. Sobre todo cenas de fin de semana.',
  },
  {
    id: 'hogar',
    name: 'Hogar y facturas',
    budgeted: 620,
    spent: 404,
    status: 'Al día',
    detail: 'Incluye luz, internet y seguro del hogar de esta semana.',
  },
  {
    id: 'transporte',
    name: 'Transporte',
    budgeted: 160,
    spent: 96,
    status: 'Por encima',
    detail: 'Más viajes en Renfe que el mes anterior.',
  },
  {
    id: 'ocio',
    name: 'Ocio y suscripciones',
    budgeted: 240,
    spent: 148,
    status: 'Al día',
    detail: 'Netflix, Spotify, Filmin y gimnasio.',
  },
  {
    id: 'ropa',
    name: 'Ropa y cuidado',
    budgeted: 200,
    spent: 84,
    status: 'Al día',
    detail: 'Dos compras puntuales de ropa de temporada este mes.',
  },
  {
    id: 'salud',
    name: 'Salud',
    budgeted: 120,
    spent: 38,
    status: 'Al día',
    detail: 'Incluye la revisión dental de agosto.',
  },
  {
    id: 'otros',
    name: 'Otros',
    budgeted: 180,
    spent: 218,
    status: 'Agotado',
    detail: 'Ya se ha superado el presupuesto de esta categoría.',
  },
]

export interface NonSpendItem {
  id: string
  label: string
  amount: number
  context: string
  tone: 'info' | 'plum' | 'neutral'
}

/** No entran en el gasto de consumo: por eso van como bloque aparte. */
export const nonSpendItems: NonSpendItem[] = [
  { id: 'ahorro', label: 'Ahorro este mes', amount: 350, context: 'Aparte del gasto de consumo', tone: 'info' },
  { id: 'inversion', label: 'Inversión este mes', amount: 300, context: 'Aportación automática', tone: 'plum' },
  {
    id: 'transferencias',
    label: 'Transferencias este mes',
    amount: 80,
    context: 'Entre tus propias cuentas',
    tone: 'neutral',
  },
]
