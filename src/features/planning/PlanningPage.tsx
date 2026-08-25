import { useEffect, useRef } from 'react'
import { Badge } from '../../components/Badge'
import { LoadingRealData } from '../../components/states/LoadingRealData'
import { useAuthStore } from '../../lib/supabase/useAuth'
import { useRealAccounts } from '../accounts/useRealAccounts'
import { useRealDebts } from '../debts/useRealDebts'
import { FinancialIndependence } from './FinancialIndependence'
import { ProjectionChart } from './ProjectionChart'
import { SavedScenarios } from './SavedScenarios'
import { ScenarioBuilder } from './ScenarioBuilder'
import { usePlanningStore } from './store'
import { useRealPlanning } from './useRealPlanning'

function Header({ isAuthenticated, loading = false }: { isAuthenticated: boolean; loading?: boolean }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line bg-surface px-4 py-5 lg:px-8">
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="font-serif text-[32px] font-semibold tracking-[-0.01em] text-ink">Planificación</h1>
          <Badge variant="info">Simulación</Badge>
        </div>
        <div className="mt-1 text-base text-ink-muted">
          {loading
            ? 'Cargando tu patrimonio, deuda e ingresos/gastos medios reales…'
            : isAuthenticated
              ? 'Simulación a partir de tu patrimonio, deuda e ingresos/gastos medios reales — el resto son hipótesis que tú eliges'
              : 'Todo lo de esta pantalla es una simulación, no un consejo financiero'}
        </div>
      </div>
    </header>
  )
}

/** Pantalla Planificación: constructor de escenarios, proyección frente al escenario base, escenarios guardados e independencia financiera. */
export function PlanningPage() {
  const session = useAuthStore((s) => s.session)
  const isAuthenticated = session !== null
  const hydrateReal = usePlanningStore((s) => s.hydrateReal)
  // currentAge solo pasa a null cuando hydrateReal ya sustituyó la semilla
  // de demo por el punto de partida real — sirve para saber si el store
  // sigue con datos de relleno mientras carga la sesión real.
  const hydratedReal = usePlanningStore((s) => s.currentAge === null)

  const { accounts: realAccounts } = useRealAccounts()
  const { debts: realDebts } = useRealDebts(realAccounts)
  const { loading: loadingReal, inputs } = useRealPlanning(realAccounts, realDebts)

  const hydratedOnceRef = useRef(false)
  useEffect(() => {
    if (!isAuthenticated || loadingReal || !inputs || hydratedOnceRef.current) return
    hydratedOnceRef.current = true
    hydrateReal({
      startingNetWorth: inputs.startingNetWorth,
      avgDebtRate: inputs.avgDebtRate,
      ingresos: Math.round(inputs.avgMonthlyIngresos),
      gastos: Math.round(inputs.avgMonthlyGastos),
    })
  }, [isAuthenticated, loadingReal, inputs, hydrateReal])

  // Nunca mostrar la proyección sembrada con cifras de demo mientras el
  // punto de partida real todavía se está calculando.
  if (isAuthenticated && !hydratedReal) {
    return (
      <>
        <Header isAuthenticated loading />
        <main className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 lg:p-8">
          <LoadingRealData />
        </main>
      </>
    )
  }

  return (
    <>
      <Header isAuthenticated={isAuthenticated} />
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
