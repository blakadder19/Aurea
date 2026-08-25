import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import type { ScenarioParams } from './domain'
import { projectedNetWorth } from './domain'
import { usePlanningStore } from './store'

const LABEL_COLOR: Record<string, string> = {
  optimista: 'text-warning-text',
  base: 'text-green-text',
  pesimista: 'text-danger-text',
}

interface ScenarioVariant {
  id: 'optimista' | 'base' | 'pesimista'
  label: string
  caption: string
  apply: (base: ScenarioParams) => ScenarioParams
}

const VARIANTS: ScenarioVariant[] = [
  { id: 'optimista', label: 'Optimista', caption: 'Rentabilidad 7 % · sin imprevistos', apply: (base) => ({ ...base, rentabilidad: 7 }) },
  { id: 'base', label: 'Base', caption: 'Rentabilidad 5 % · situación actual', apply: (base) => ({ ...base }) },
  {
    id: 'pesimista',
    label: 'Pesimista',
    caption: 'Rentabilidad 2 % · un imprevisto grande',
    apply: (base) => ({ ...base, rentabilidad: 2, compraExtraordinaria: 12000 }),
  },
]

/** Tres escenarios guardados (variaciones sobre el escenario base real o demo), proyectados al horizonte seleccionado. */
export function SavedScenarios() {
  const horizonYears = usePlanningStore((s) => s.horizonYears)
  const startingNetWorth = usePlanningStore((s) => s.startingNetWorth)
  const avgDebtRate = usePlanningStore((s) => s.avgDebtRate)
  const baseParams = usePlanningStore((s) => s.baseParams)

  return (
    <Card padding="lg" className="flex flex-col gap-4">
      <h2 className="font-serif text-[22px] font-semibold text-ink">Escenarios guardados</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {VARIANTS.map((scenario) => {
          const value = projectedNetWorth(startingNetWorth, scenario.apply(baseParams), horizonYears * 12, avgDebtRate)
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
