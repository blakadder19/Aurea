import { useState } from 'react'
import { AllocatePanel } from './AllocatePanel'
import { EmergencyFundCard } from './EmergencyFundCard'
import { GoalCard } from './GoalCard'
import { RealEmergencyFundCard } from './RealEmergencyFundCard'
import { RealGoalPanel, type RealGoalPanelMode } from './RealGoalPanel'
import { useGoalsStore } from './store'
import { contributeToGoal, createGoal, toGoalCardProps, useRealGoals } from './useRealGoals'
import { useRealEmergencyFund } from './useRealEmergencyFund'
import { EmptyState } from '../../components/states/EmptyState'
import { LoadingRealData } from '../../components/states/LoadingRealData'
import { UndoBar } from '../../components/UndoBar'
import { goals as demoGoals } from '../../data/goals'
import { useRealAccounts } from '../accounts/useRealAccounts'
import { useAuthStore } from '../../lib/supabase/useAuth'

function Header({
  isAuthenticated,
  hasRealGoals,
  count,
  onCreate,
  onContribute,
}: {
  isAuthenticated: boolean
  hasRealGoals: boolean
  count: number
  onCreate: () => void
  onContribute: () => void
}) {
  const openPanel = useGoalsStore((s) => s.openPanel)
  const canContribute = !isAuthenticated || hasRealGoals

  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line bg-surface px-4 py-5 lg:px-6 lg:py-4">
      <div>
        <h1 className="font-serif text-[32px] lg:text-[26px] font-semibold tracking-[-0.01em] text-ink">Objetivos</h1>
        <div className="mt-1 text-base text-ink-muted">{count} objetivo{count === 1 ? '' : 's'} activo{count === 1 ? '' : 's'}</div>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {isAuthenticated && (
          <button
            type="button"
            onClick={onCreate}
            className="min-h-11 rounded-md border border-line bg-surface px-[18px] py-2.5 text-base font-semibold text-ink hover:bg-canvas"
          >
            Nuevo objetivo
          </button>
        )}
        {canContribute && (
          <button
            type="button"
            id="registrar-aportacion-btn"
            onClick={isAuthenticated ? onContribute : openPanel}
            className="min-h-11 rounded-md border border-brand bg-brand px-[18px] py-2.5 text-base font-semibold text-surface hover:bg-brand-hover"
          >
            Registrar aportación
          </button>
        )}
      </div>
    </header>
  )
}

/** Pantalla Objetivos: fondo de emergencia, tarjetas de objetivo y panel de aportación. */
export function GoalsPage() {
  const undoMessage = useGoalsStore((s) => s.undoMessage)
  const undoLastContribution = useGoalsStore((s) => s.undoLastContribution)
  const session = useAuthStore((s) => s.session)
  const [panelMode, setPanelMode] = useState<RealGoalPanelMode>(null)

  const { loading: loadingReal, goals: realGoals, refetch } = useRealGoals()
  const { accounts: realAccounts } = useRealAccounts()
  const { data: emergencyFund } = useRealEmergencyFund(realAccounts)

  const isAuthenticated = session !== null
  const hasRealGoals = isAuthenticated && !loadingReal && realGoals !== null && realGoals.length > 0
  const today = new Date()

  async function handleCreate(name: string, targetCents: number, monthlyContributionCents: number) {
    return createGoal(name, targetCents, monthlyContributionCents)
  }

  async function handleContribute(goalId: string, currentSavedCents: number, amountCents: number) {
    return contributeToGoal(goalId, currentSavedCents, amountCents)
  }

  const count = isAuthenticated ? (realGoals?.length ?? 0) : demoGoals.length + 1

  return (
    <>
      <Header
        isAuthenticated={isAuthenticated}
        hasRealGoals={hasRealGoals}
        count={count}
        onCreate={() => setPanelMode('create')}
        onContribute={() => setPanelMode('contribute')}
      />
      <main className="flex flex-1 flex-col gap-6 lg:gap-5 overflow-y-auto p-4 lg:p-6">
        {!isAuthenticated && <EmergencyFundCard />}
        {isAuthenticated && emergencyFund && <RealEmergencyFundCard fund={emergencyFund} />}
        {isAuthenticated && loadingReal ? (
          <LoadingRealData />
        ) : isAuthenticated && !loadingReal && realGoals?.length === 0 ? (
          <EmptyState
            headline="Todavía no hay objetivos"
            body="Crea el primero para ver aquí tu progreso real frente al previsto."
            action={{ label: 'Crear un objetivo', onClick: () => setPanelMode('create') }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {hasRealGoals
              ? realGoals!.map((g) => <GoalCard key={g.id} goal={toGoalCardProps(g)} asOf={today} />)
              : demoGoals.map((g) => <GoalCard key={g.id} goal={g} />)}
          </div>
        )}
        {!isAuthenticated && undoMessage && <UndoBar message={undoMessage} onUndo={undoLastContribution} />}
      </main>
      {isAuthenticated ? (
        <RealGoalPanel
          mode={panelMode}
          goals={realGoals ?? []}
          onClose={() => setPanelMode(null)}
          onCreate={handleCreate}
          onContribute={handleContribute}
          onDone={() => {
            refetch()
            setPanelMode(null)
          }}
        />
      ) : (
        <AllocatePanel />
      )}
    </>
  )
}
