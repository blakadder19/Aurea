import { StaleDataNotice } from '../../components/states/StaleDataNotice'
import { connections } from '../../data/settings'
import { useSettingsStore } from '../settings/store'
import { AllocationCard } from './AllocationCard'
import { PortfolioSummaryCard } from './PortfolioSummaryCard'
import { PositionsTable } from './PositionsTable'
import { ProductTypeBreakdown } from './ProductTypeBreakdown'
import { useInvestmentsStore, type InvestmentsView } from './store'

const myInvestorBase = connections.find((c) => c.id === 'myinvestor')!

const VIEWS: { value: InvestmentsView; label: string }[] = [
  { value: 'resumen', label: 'Resumen' },
  { value: 'detalle', label: 'Detalle' },
]

function Header() {
  const mode = useInvestmentsStore((s) => s.mode)
  const setMode = useInvestmentsStore((s) => s.setMode)

  return (
    <header className="flex flex-col gap-4 border-b border-line bg-surface px-4 py-5 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-[32px] font-semibold tracking-[-0.01em] text-ink">Inversiones</h1>
          <div className="mt-1 text-base text-ink-muted">Cotizaciones simuladas · actualizadas hoy a las 08:42</div>
        </div>
        <button
          type="button"
          className="min-h-11 rounded-md border border-green bg-green px-[18px] py-2.5 text-base font-semibold text-surface hover:bg-green-hover"
        >
          Registrar aportación
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-[13px] font-semibold tracking-[0.08em] text-ink-muted uppercase">Vista</span>
        <div className="flex flex-wrap gap-1 rounded-md border border-line bg-canvas p-1">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              type="button"
              onClick={() => setMode(v.value)}
              aria-pressed={mode === v.value}
              className={`min-h-11 rounded-sm px-[18px] py-2 text-[15px] ${
                mode === v.value
                  ? 'border border-line bg-surface font-semibold text-ink'
                  : 'border border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}

/** Pantalla Inversiones: valor y evolución, posiciones, y asignación frente a objetivo. */
export function InvestmentsPage() {
  const isDetalle = useInvestmentsStore((s) => s.mode === 'detalle')
  const myInvestorStatus = useSettingsStore((s) => s.connectionOverrides.myinvestor?.status ?? myInvestorBase.status)
  const reconnect = useSettingsStore((s) => s.reconnect)

  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 lg:p-8">
        {myInvestorStatus === 'error' && (
          <StaleDataNotice
            ageLabel="hace 3 días"
            body="MyInvestor no responde desde el 16 ago. Las cifras de Inversiones pueden no ser exactas."
            onReconnect={() => reconnect('myinvestor')}
          />
        )}
        <PortfolioSummaryCard />
        <PositionsTable />
        {isDetalle && <ProductTypeBreakdown />}
        <AllocationCard />
      </main>
    </>
  )
}
