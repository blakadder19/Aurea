import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { AVG_DEBT_RATE, STARTING_NET_WORTH, savedScenarios } from '../../data/planning'
import { projectedNetWorth } from './domain'
import { usePlanningStore } from './store'

const LABEL_COLOR: Record<string, string> = {
  optimista: 'text-warning-text',
  base: 'text-green-text',
  pesimista: 'text-danger-text',
}

/** Tres escenarios guardados con supuestos fijos, proyectados al horizonte seleccionado. */
export function SavedScenarios() {
  const horizonYears = usePlanningStore((s) => s.horizonYears)

  return (
    <Card padding="lg" className="flex flex-col gap-4">
      <h2 className="font-serif text-[22px] font-semibold text-ink">Escenarios guardados</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {savedScenarios.map((scenario) => {
          const value = projectedNetWorth(STARTING_NET_WORTH, scenario.params, horizonYears * 12, AVG_DEBT_RATE)
          const isBase = scenario.id === 'base'
          return (
            <div
              key={scenario.id}
              className={`flex flex-col gap-2 rounded-[14px] border p-[18px] ${
                isBase ? 'border-2 border-green' : 'border-line'
              }`}
            >
              <div className={`text-[15px] font-bold ${LABEL_COLOR[scenario.id] ?? 'text-ink'}`}>{scenario.label}</div>
              <Money value={value} decimals={0} className="text-[22px] font-bold" />
              <div className="text-sm text-ink-muted">{scenario.caption}</div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
