export interface ScenarioParams {
  ingresos: number
  gastos: number
  aportacion: number
  rentabilidad: number
  inflacion: number
  compraExtraordinaria: number
  pagoExtraDeuda: number
}

/**
 * Patrimonio proyectado a `months` meses: la aportación mensual capitaliza a
 * la rentabilidad real (rentabilidad − inflación); el resto del ahorro
 * disponible (ingresos − gastos − aportación) se suma sin capitalizar, como
 * colchón en cuenta corriente. El pago extra de deuda se trata como el
 * interés medio de las deudas actuales que deja de pagarse, acumulado
 * durante el horizonte (el reparto deuda a deuda ya lo hace el simulador de
 * la pantalla Deudas).
 */
export function projectedNetWorth(
  startingNetWorth: number,
  params: ScenarioParams,
  months: number,
  avgDebtRate: number,
): number {
  const realAnnualRate = (params.rentabilidad - params.inflacion) / 100
  const monthlyRate = realAnnualRate / 12
  const pv = startingNetWorth - params.compraExtraordinaria
  const monthlySurplus = params.ingresos - params.gastos - params.aportacion

  const invested =
    Math.abs(monthlyRate) < 1e-9
      ? pv + params.aportacion * months
      : pv * (1 + monthlyRate) ** months +
        params.aportacion * (((1 + monthlyRate) ** months - 1) / monthlyRate)

  const years = months / 12
  const debtBoost = params.pagoExtraDeuda * ((1 + avgDebtRate) ** years - 1)

  return invested + monthlySurplus * months + debtBoost
}

export interface ProjectionPoint {
  year: number
  value: number
}

export function buildProjectionSeries(
  startingNetWorth: number,
  params: ScenarioParams,
  horizonYears: number,
  avgDebtRate: number,
): ProjectionPoint[] {
  const points: ProjectionPoint[] = []
  for (let year = 0; year <= horizonYears; year++) {
    points.push({ year, value: projectedNetWorth(startingNetWorth, params, year * 12, avgDebtRate) })
  }
  return points
}

/** Meses necesarios para alcanzar `target`, con el mismo modelo que la proyección. */
export function monthsToTarget(
  startingNetWorth: number,
  params: ScenarioParams,
  target: number,
  avgDebtRate: number,
): number {
  if (startingNetWorth >= target) return 0
  for (let months = 1; months <= 1200; months++) {
    if (projectedNetWorth(startingNetWorth, params, months, avgDebtRate) >= target) return months
  }
  return Infinity
}
