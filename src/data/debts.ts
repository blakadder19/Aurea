/**
 * Datos ficticios de Deudas — miércoles 19 de agosto de 2026.
 * Cuadran con PLAN.md y Cuentas y patrimonio: pasivos −156.362,30 €.
 */

export interface Debt {
  id: string
  name: string
  institution: string
  balance: number
  annualRate: number
  /** null para deuda revolving sin cuota fija (tarjeta). */
  monthlyPayment: number | null
  paymentLabel: string
  nextPaymentLabel: string
  /** Nota de "pago extra pendiente" guardada desde el simulador — solo real, nunca fabricada en demo. */
  reminder?: string | null
}

export const debts: Debt[] = [
  {
    id: 'hipoteca',
    name: 'Hipoteca',
    institution: 'Bankinter',
    balance: 148320.0,
    annualRate: 0.0285,
    monthlyPayment: 612.4,
    paymentLabel: '612,40 €/mes',
    nextPaymentLabel: '1 sep',
  },
  {
    id: 'coche',
    name: 'Préstamo del coche',
    institution: 'Nómina · Openbank',
    balance: 6480.0,
    annualRate: 0.064,
    monthlyPayment: 186.2,
    paymentLabel: '186,20 €/mes',
    nextPaymentLabel: '28 ago',
  },
  {
    id: 'tarjeta',
    name: 'Tarjeta de crédito',
    institution: 'Openbank Visa',
    balance: 842.3,
    annualRate: 0.199,
    monthlyPayment: null,
    paymentLabel: 'Saldo completo',
    nextPaymentLabel: '2 sep',
  },
  {
    id: 'portatil',
    name: 'Portátil a plazos',
    institution: 'Nómina · Openbank',
    balance: 720.0,
    annualRate: 0,
    monthlyPayment: 180.0,
    paymentLabel: '180,00 € × 4',
    nextPaymentLabel: '15 sep',
  },
]

export const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0)

/**
 * Comparación bola de nieve / avalancha: cifras de demostración fijas
 * (no un simulador en vivo — eso es lo que hace el panel de pago
 * extraordinario). Mismas cifras de partida para las dos estrategias.
 */
export const strategies = {
  snowball: {
    label: 'Bola de nieve · de menor a mayor saldo',
    order: ['Portátil', 'Tarjeta', 'Coche', 'Hipoteca'],
    totalDuration: '14 años y 2 meses',
    totalInterest: 31240,
  },
  avalanche: {
    label: 'Avalancha · de mayor a menor interés',
    order: ['Tarjeta', 'Coche', 'Hipoteca', 'Portátil'],
    totalDuration: '14 años y 2 meses',
    totalInterest: 29910,
  },
}
