import { useState } from 'react'
import { StaleDataNotice } from '../../components/states/StaleDataNotice'
import { EmptyState } from '../../components/states/EmptyState'
import { connections } from '../../data/settings'
import { useSettingsStore } from '../settings/store'
import { useAuthStore } from '../../lib/supabase/useAuth'
import { AllocationCard } from './AllocationCard'
import { InvestmentPanel, type InvestmentFormValues } from './InvestmentPanel'
import { PortfolioSummaryCard } from './PortfolioSummaryCard'
import { PositionsTable } from './PositionsTable'
import { ProductTypeBreakdown } from './ProductTypeBreakdown'
import { useInvestmentsStore, type InvestmentsView } from './store'
import { saveInvestment, toPositionRow, useRealInvestments, type RealInvestment } from './useRealInvestments'

const myInvestorBase = connections.find((c) => c.id === 'myinvestor')!

const VIEWS: { value: InvestmentsView; label: string }[] = [
  { value: 'resumen', label: 'Resumen' },
  { value: 'detalle', label: 'Detalle' },
]

function Header({ isAuthenticated, onAdd }: { isAuthenticated: boolean; onAdd: () => void }) {
  const mode = useInvestmentsStore((s) => s.mode)
  const setMode = useInvestmentsStore((s) => s.setMode)

  return (
    <header className="flex flex-col gap-4 border-b border-line bg-surface px-4 py-5 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-[32px] font-semibold tracking-[-0.01em] text-ink">Inversiones</h1>
          <div className="mt-1 text-base text-ink-muted">
            {isAuthenticated ? 'Posiciones gestionadas a mano, sin cotización en vivo' : 'Cotizaciones simuladas · actualizadas hoy a las 08:42'}
          </div>
        </div>
        {isAuthenticated && (
          <button
            type="button"
            onClick={onAdd}
            className="min-h-11 rounded-md border border-green bg-green px-[18px] py-2.5 text-base font-semibold text-surface hover:bg-green-hover"
          >
            Añadir posición
          </button>
        )}
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
  const session = useAuthStore((s) => s.session)

  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing] = useState<RealInvestment | null>(null)

  const { loading: loadingReal, investments: realInvestments, refetch } = useRealInvestments()

  const isAuthenticated = session !== null
  const hasRealInvestments = isAuthenticated && !loadingReal && realInvestments !== null && realInvestments.length > 0
  const realPositions = hasRealInvestments ? realInvestments!.map(toPositionRow) : []

  const realSummary = hasRealInvestments
    ? realPositions.reduce(
        (acc, p) => ({ currentValue: acc.currentValue + p.value, contributed: acc.contributed + p.contributed }),
        { currentValue: 0, contributed: 0 },
      )
    : null
  const realGain = realSummary ? realSummary.currentValue - realSummary.contributed : 0
  const realGainPct = realSummary && realSummary.contributed > 0 ? (realGain / realSummary.contributed) * 100 : 0

  function openCreate() {
    setEditing(null)
    setPanelOpen(true)
  }

  function openEdit(id: string) {
    const found = realInvestments?.find((i) => i.id === id) ?? null
    setEditing(found)
    setPanelOpen(true)
  }

  async function handleSave(id: string | undefined, values: InvestmentFormValues) {
    return saveInvestment({ id, ...values })
  }

  return (
    <>
      <Header isAuthenticated={isAuthenticated} onAdd={openCreate} />
      <main className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 lg:p-8">
        {!isAuthenticated && myInvestorStatus === 'error' && (
          <StaleDataNotice
            ageLabel="hace 3 días"
            body="MyInvestor no responde desde el 16 ago. Las cifras de Inversiones pueden no ser exactas."
            onReconnect={() => reconnect('myinvestor')}
          />
        )}
        {isAuthenticated && !loadingReal && realInvestments?.length === 0 ? (
          <EmptyState
            headline="Todavía no tienes posiciones"
            body="Añade la primera para llevar el seguimiento de tus inversiones."
            action={{ label: 'Añadir posición', onClick: openCreate }}
          />
        ) : (
          <>
            <PortfolioSummaryCard real={hasRealInvestments ? { ...realSummary!, gain: realGain, gainPct: realGainPct } : undefined} />
            <PositionsTable positions={hasRealInvestments ? realPositions : undefined} onEditPosition={hasRealInvestments ? openEdit : undefined} />
            {isDetalle && <ProductTypeBreakdown positions={hasRealInvestments ? realPositions : undefined} />}
            {!isAuthenticated && <AllocationCard />}
          </>
        )}
      </main>
      <InvestmentPanel
        open={panelOpen}
        initial={editing}
        onClose={() => setPanelOpen(false)}
        onSave={handleSave}
        onDone={() => {
          refetch()
          setPanelOpen(false)
        }}
      />
    </>
  )
}
