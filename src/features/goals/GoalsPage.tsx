import { AllocatePanel } from './AllocatePanel'
import { EmergencyFundCard } from './EmergencyFundCard'
import { GoalCard } from './GoalCard'
import { useGoalsStore } from './store'
import { UndoBar } from '../../components/UndoBar'
import { goals } from '../../data/goals'

function Header() {
  const openPanel = useGoalsStore((s) => s.openPanel)

  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line bg-surface px-4 py-5 lg:px-8">
      <div>
        <h1 className="font-serif text-[32px] font-semibold tracking-[-0.01em] text-ink">Objetivos</h1>
        <div className="mt-1 text-base text-ink-muted">{goals.length + 1} objetivos activos</div>
      </div>
      <button
        type="button"
        id="registrar-aportacion-btn"
        onClick={openPanel}
        className="min-h-11 rounded-md border border-green bg-green px-[18px] py-2.5 text-base font-semibold text-surface hover:bg-green-hover"
      >
        Registrar aportación
      </button>
    </header>
  )
}

/** Pantalla Objetivos: fondo de emergencia, tarjetas de objetivo y panel de aportación. */
export function GoalsPage() {
  const undoMessage = useGoalsStore((s) => s.undoMessage)
  const undoLastContribution = useGoalsStore((s) => s.undoLastContribution)

  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 lg:p-8">
        <EmergencyFundCard />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} />
          ))}
        </div>
        {undoMessage && <UndoBar message={undoMessage} onUndo={undoLastContribution} />}
      </main>
      <AllocatePanel />
    </>
  )
}
