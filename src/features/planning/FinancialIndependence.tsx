import { Badge } from '../../components/Badge'
import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { AVG_DEBT_RATE, ASSUMED_CURRENT_AGE, STARTING_NET_WORTH } from '../../data/planning'
import { monthsToTarget } from './domain'
import { usePlanningStore } from './store'

/** Bloque de independencia financiera: capital objetivo y edad estimada, con la tasa de retirada editable. */
export function FinancialIndependence() {
  const params = usePlanningStore((s) => s.params)
  const withdrawalRate = usePlanningStore((s) => s.withdrawalRate)
  const setWithdrawalRate = usePlanningStore((s) => s.setWithdrawalRate)

  const capitalObjetivo = withdrawalRate > 0 ? (params.gastos * 12) / (withdrawalRate / 100) : Infinity
  const months = Number.isFinite(capitalObjetivo)
    ? monthsToTarget(STARTING_NET_WORTH, params, capitalObjetivo, AVG_DEBT_RATE)
    : Infinity
  const yearsLeft = Number.isFinite(months) ? Math.ceil(months / 12) : null
  const arrivalAge = yearsLeft !== null ? ASSUMED_CURRENT_AGE + yearsLeft : null

  return (
    <Card tone="green-soft" padding="lg" className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <h2 className="font-serif text-[22px] font-semibold text-ink">Independencia financiera</h2>
        <Badge variant="info">Simulación</Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 tabular sm:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[15px] font-semibold text-ink">Tasa de retirada anual</span>
          <input
            type="number"
            min={1}
            max={10}
            step={0.5}
            value={withdrawalRate}
            onChange={(e) => setWithdrawalRate(Math.max(0.5, Number(e.target.value)))}
            className="min-h-11 rounded-md border border-green-soft-line bg-surface px-3.5 py-2.5 text-base text-ink"
          />
        </label>
        <div>
          <div className="text-sm text-green-text">Capital objetivo</div>
          {Number.isFinite(capitalObjetivo) ? (
            <Money value={capitalObjetivo} decimals={0} className="text-[26px] font-bold" />
          ) : (
            <div className="text-[26px] font-bold text-ink">—</div>
          )}
        </div>
        <div>
          <div className="text-sm text-green-text">Edad estimada de llegada</div>
          <div className="text-[26px] font-bold text-ink">{arrivalAge !== null ? `${arrivalAge} años` : 'Más de 100 años'}</div>
        </div>
      </div>

      <p className="text-base text-ink text-pretty">
        Bajar la tasa de retirada exige más capital objetivo pero deja más margen si el mercado va mal; subirla
        adelanta la llegada, a cambio de un fondo más ajustado. Con el {withdrawalRate.toLocaleString('es-ES', { minimumFractionDigits: 1 })} %
        actual, cada punto que subas o bajes mueve el capital objetivo en sentido contrario.
      </p>
    </Card>
  )
}
