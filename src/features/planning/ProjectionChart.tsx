import { Line, LineChart, ResponsiveContainer } from 'recharts'
import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { buildProjectionSeries } from './domain'
import { usePlanningStore } from './store'

/** Gráfico de proyección: escenario editado frente al escenario base, con leyenda de texto. */
export function ProjectionChart() {
  const params = usePlanningStore((s) => s.params)
  const horizonYears = usePlanningStore((s) => s.horizonYears)
  const startingNetWorth = usePlanningStore((s) => s.startingNetWorth)
  const avgDebtRate = usePlanningStore((s) => s.avgDebtRate)
  const baseParams = usePlanningStore((s) => s.baseParams)
  const today = usePlanningStore((s) => s.today)

  const scenarioSeries = buildProjectionSeries(startingNetWorth, params, horizonYears, avgDebtRate)
  const baseSeries = buildProjectionSeries(startingNetWorth, baseParams, horizonYears, avgDebtRate)
  const chartData = scenarioSeries.map((point, i) => ({
    year: point.year,
    scenario: point.value,
    base: baseSeries[i].value,
  }))

  const targetYear = today.getFullYear() + horizonYears
  const scenarioFinal = scenarioSeries[scenarioSeries.length - 1].value
  const baseFinal = baseSeries[baseSeries.length - 1].value

  return (
    <Card padding="lg" className="flex flex-col gap-[18px]">
      <h2 className="font-serif text-[22px] font-semibold text-ink">Patrimonio proyectado a {horizonYears} años</h2>

      <div className="h-[180px] w-full" role="img" aria-label="Proyección del patrimonio de este escenario comparada con el escenario base">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <Line type="monotone" dataKey="base" stroke="#c4ccc8" strokeWidth={2} strokeDasharray="6 5" dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="scenario" stroke="#0f6b4f" strokeWidth={3} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-6 text-[15px] text-ink-muted">
        <div className="flex items-center gap-2">
          <span className="inline-block h-[3px] w-4 rounded-full bg-green" />
          Este escenario
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-[2px] w-4 rounded-full bg-[#c4ccc8]" />
          Escenario base
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 border-t border-line pt-4 tabular sm:grid-cols-2">
        <div>
          <div className="text-sm text-ink-muted">Patrimonio en {targetYear} · este escenario</div>
          <Money value={scenarioFinal} decimals={0} className="text-[26px] font-bold" />
        </div>
        <div>
          <div className="text-sm text-ink-muted">Patrimonio en {targetYear} · escenario base</div>
          <Money value={baseFinal} decimals={0} tone="muted" className="text-[26px] font-bold" />
        </div>
      </div>
    </Card>
  )
}
