import { Badge } from '../../components/Badge'
import { FinancialIndependence } from './FinancialIndependence'
import { ProjectionChart } from './ProjectionChart'
import { SavedScenarios } from './SavedScenarios'
import { ScenarioBuilder } from './ScenarioBuilder'

function Header() {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line bg-surface px-4 py-5 lg:px-8">
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="font-serif text-[32px] font-semibold tracking-[-0.01em] text-ink">Planificación</h1>
          <Badge variant="info">Simulación</Badge>
        </div>
        <div className="mt-1 text-base text-ink-muted">Todo lo de esta pantalla es una simulación, no un consejo financiero</div>
      </div>
    </header>
  )
}

/** Pantalla Planificación: constructor de escenarios, proyección frente al escenario base, escenarios guardados e independencia financiera. */
export function PlanningPage() {
  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <ScenarioBuilder />
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <ProjectionChart />
            <SavedScenarios />
          </div>
        </div>
        <FinancialIndependence />
      </main>
    </>
  )
}
