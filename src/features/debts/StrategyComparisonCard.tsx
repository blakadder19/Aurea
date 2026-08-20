import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { strategies } from '../../data/debts'

/**
 * Bola de nieve frente a avalancha: mismas cifras de partida, mismo formato,
 * sin declarar ganadora — solo se explica qué prioriza cada método.
 */
export function StrategyComparisonCard() {
  const interestDiff = strategies.snowball.totalInterest - strategies.avalanche.totalInterest

  return (
    <Card padding="lg" className="flex flex-col gap-[18px]">
      <h2 className="font-serif text-2xl font-semibold text-ink">Bola de nieve o avalancha: mismos datos, distinto orden</h2>
      <p className="text-base text-ink text-pretty">
        Ninguna es «la correcta»: la bola de nieve motiva con victorias rápidas, la avalancha ahorra más intereses.
        Aquí tienes ambas con tus cifras reales.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-lg border border-line p-5">
          <div className="text-[17px] font-bold text-ink">{strategies.snowball.label}</div>
          <div className="text-[15px] text-ink-muted">Orden: {strategies.snowball.order.join(' → ')}</div>
          <div className="flex justify-between border-t border-line pt-2.5 text-base text-ink tabular">
            <span>Tiempo hasta liquidar todo</span>
            <span className="font-bold">{strategies.snowball.totalDuration}</span>
          </div>
          <div className="flex justify-between text-base text-ink tabular">
            <span>Intereses totales pagados</span>
            <Money value={strategies.snowball.totalInterest} decimals={0} className="font-bold" />
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-line p-5">
          <div className="text-[17px] font-bold text-ink">{strategies.avalanche.label}</div>
          <div className="text-[15px] text-ink-muted">Orden: {strategies.avalanche.order.join(' → ')}</div>
          <div className="flex justify-between border-t border-line pt-2.5 text-base text-ink tabular">
            <span>Tiempo hasta liquidar todo</span>
            <span className="font-bold">{strategies.avalanche.totalDuration}</span>
          </div>
          <div className="flex justify-between text-base text-green tabular">
            <span>Intereses totales pagados</span>
            <span className="font-bold">
              <Money value={strategies.avalanche.totalInterest} decimals={0} tone="green" /> (
              <Money value={-interestDiff} decimals={0} tone="green" />)
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}
