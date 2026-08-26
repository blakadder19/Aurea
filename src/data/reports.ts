import type { MonthlyReport } from '../features/reports/reportCalc'

/**
 * Informe mensual de demostración — julio de 2026, el mes cerrado más
 * reciente antes de la fecha de contexto (miércoles 19 ago 2026).
 * Categorías tomadas de `data/budget.ts` para que los nombres cuadren con
 * Presupuesto, con cifras de un mes completo (no del día 19 parcial).
 */
export const demoMonthlyReport: MonthlyReport = {
  monthLabel: 'julio de 2026',
  incomeCents: 320000,
  expenseCents: 276000,
  netCents: 44000,
  savingsRatePct: 13.75,
  categories: [
    { name: 'Hogar y facturas', categoryId: null, spentCents: 65000, pctOfTotal: (65000 / 276000) * 100 },
    { name: 'Restaurantes', categoryId: null, spentCents: 52000, pctOfTotal: (52000 / 276000) * 100 },
    { name: 'Supermercado', categoryId: null, spentCents: 48000, pctOfTotal: (48000 / 276000) * 100 },
    { name: 'Otros', categoryId: null, spentCents: 34000, pctOfTotal: (34000 / 276000) * 100 },
    { name: 'Ocio y suscripciones', categoryId: null, spentCents: 26000, pctOfTotal: (26000 / 276000) * 100 },
    { name: 'Transporte', categoryId: null, spentCents: 18000, pctOfTotal: (18000 / 276000) * 100 },
    { name: 'Ropa y cuidado', categoryId: null, spentCents: 17000, pctOfTotal: (17000 / 276000) * 100 },
    { name: 'Salud', categoryId: null, spentCents: 16000, pctOfTotal: (16000 / 276000) * 100 },
  ],
  previousExpenseCents: 291000,
  expenseDeltaCents: -15000,
  expenseDeltaPct: (-15000 / 291000) * 100,
  previousYearExpenseCents: null,
  yearExpenseDeltaCents: null,
  yearExpenseDeltaPct: null,
  merchants: [
    { name: 'Mercadona', spentCents: 21000, pctOfTotal: (21000 / 276000) * 100 },
    { name: 'Naturgy', spentCents: 14000, pctOfTotal: (14000 / 276000) * 100 },
    { name: 'Deliveroo', spentCents: 9800, pctOfTotal: (9800 / 276000) * 100 },
    { name: 'Netflix', spentCents: 1299, pctOfTotal: (1299 / 276000) * 100 },
  ],
}
