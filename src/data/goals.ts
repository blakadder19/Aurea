/**
 * Datos ficticios de Objetivos — miércoles 19 de agosto de 2026.
 * Cuadran con PLAN.md: Emergencia 8.900/11.880 € · Japón 2.150/4.000 € ·
 * Reforma 3.500/15.000 €.
 */

export const emergencyFund = {
  saved: 8900,
  target: 11880,
  targetMonths: 6,
  monthlyEssentialSpend: 1980,
  /** Aportación mensual media al fondo, para proyectar la fecha. */
  monthlyContribution: 480,
  /** Progreso previsto a estas alturas del plan (marca en la barra). */
  expectedProgressPct: 80,
}

export interface Goal {
  id: string
  name: string
  saved: number
  target: number
  monthlyContribution: number
  status: 'success' | 'danger'
  statusLabel: string
  note: string
  icon?: string | null
  color?: string | null
}

export const goals: Goal[] = [
  {
    id: 'japon',
    name: 'Viaje a Japón',
    saved: 2150,
    target: 4000,
    monthlyContribution: 200,
    status: 'success',
    statusLabel: 'Al día',
    note: 'con la hucha «por confirmar» incluida',
  },
  {
    id: 'reforma',
    name: 'Entrada para la reforma',
    saved: 3500,
    target: 15000,
    monthlyContribution: 190,
    status: 'danger',
    statusLabel: 'Requiere revisión',
    note: 'sube la aportación mensual para adelantarlo',
  },
]
