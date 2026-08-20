import { DebtsTable } from './DebtsTable'
import { ExtraPaymentPanel } from './ExtraPaymentPanel'
import { StrategyComparisonCard } from './StrategyComparisonCard'
import { useDebtsStore } from './store'
import { Money } from '../../components/Money'
import { totalDebt } from '../../data/debts'

function Header() {
  const openSimulator = useDebtsStore((s) => s.openSimulator)

  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line bg-surface px-4 py-5 lg:px-8">
      <div>
        <h1 className="font-serif text-[32px] font-semibold tracking-[-0.01em] text-ink">Deudas</h1>
        <div className="mt-1 text-base text-ink-muted tabular">
          <Money value={totalDebt} /> pendientes en 4 deudas
        </div>
      </div>
      <button
        type="button"
        id="simular-pago-btn"
        onClick={openSimulator}
        className="min-h-11 rounded-md border border-green bg-green px-[18px] py-2.5 text-base font-semibold text-surface hover:bg-green-hover"
      >
        Simular pago extraordinario
      </button>
    </header>
  )
}

/** Pantalla Deudas: tabla, comparación de estrategias, y simulador de pago extraordinario. */
export function DebtsPage() {
  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 lg:p-8">
        <DebtsTable />
        <StrategyComparisonCard />
      </main>
      <ExtraPaymentPanel />
    </>
  )
}
