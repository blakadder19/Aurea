import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { compareDebtStrategies, formatDuration, type StrategyDebtInput } from './domain'
import type { RealDebt } from './useRealDebts'

const euros = (cents: number) => cents / 100

/**
 * Avalancha vs. bola de nieve con tus deudas reales: simula mes a mes el
 * pago de todas a la vez (cada cuota mínima + lo que se libera al liquidar
 * una se redirige a la siguiente), no solo months-to-payoff por separado.
 * Solo cuenta con las deudas que ya tienen cuota mensual guardada — sin
 * eso no hay nada que simular.
 */
export function RealStrategyComparisonCard({ debts }: { debts: RealDebt[] }) {
  const inputs: StrategyDebtInput[] = debts
    .filter((d) => d.monthlyPaymentCents !== null && d.monthlyPaymentCents > 0)
    .map((d) => ({ id: d.accountId, name: d.name, balanceCents: d.balanceCents, annualRateBps: d.annualRateBps, monthlyPaymentCents: d.monthlyPaymentCents! }))

  if (inputs.length < 2) {
    return (
      <Card padding="lg" className="flex flex-col gap-3">
        <h2 className="font-serif text-2xl font-semibold text-ink">Bola de nieve o avalancha: mismos datos, distinto orden</h2>
        <p className="text-base text-ink-muted">
          Hace falta la cuota mensual de al menos dos deudas para comparar en qué orden pagarlas. Añádela desde "Editar" en cada una.
        </p>
      </Card>
    )
  }

  const { avalanche, snowball } = compareDebtStrategies(inputs)
  const interestDiffCents = snowball.totalInterestCents - avalanche.totalInterestCents

  return (
    <Card padding="lg" className="flex flex-col gap-[18px]">
      <h2 className="font-serif text-2xl font-semibold text-ink">Bola de nieve o avalancha: mismos datos, distinto orden</h2>
      <p className="text-base text-ink text-pretty">
        Ninguna es «la correcta»: la bola de nieve motiva con victorias rápidas, la avalancha ahorra más intereses. Aquí tienes ambas con tus cifras reales.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-lg border border-line p-5">
          <div className="text-[17px] font-bold text-ink">Bola de nieve</div>
          <div className="text-[15px] text-ink-muted">Orden: {snowball.order.join(' → ')}</div>
          <div className="flex justify-between border-t border-line pt-2.5 text-base text-ink tabular">
            <span>Tiempo hasta liquidar todo</span>
            <span className="font-bold">{formatDuration(snowball.totalMonths)}</span>
          </div>
          <div className="flex justify-between text-base text-ink tabular">
            <span>Intereses totales pagados</span>
            <Money value={euros(snowball.totalInterestCents)} decimals={0} className="font-bold" />
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-line p-5">
          <div className="text-[17px] font-bold text-ink">Avalancha</div>
          <div className="text-[15px] text-ink-muted">Orden: {avalanche.order.join(' → ')}</div>
          <div className="flex justify-between border-t border-line pt-2.5 text-base text-ink tabular">
            <span>Tiempo hasta liquidar todo</span>
            <span className="font-bold">{formatDuration(avalanche.totalMonths)}</span>
          </div>
          <div className="flex justify-between text-base text-brand tabular">
            <span>Intereses totales pagados</span>
            <span className="font-bold">
              <Money value={euros(avalanche.totalInterestCents)} decimals={0} tone="green" /> (<Money value={-euros(interestDiffCents)} decimals={0} tone="green" />)
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}
