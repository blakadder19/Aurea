import { useState } from 'react'
import { AttentionTray } from './AttentionTray'
import { TodayCard } from './TodayCard'
import { buildTodayHeadline } from './todayCalc'
import { AvailableTodayCard } from './AvailableTodayCard'
import { BudgetBreakdownTable } from './BudgetBreakdownTable'
import { BudgetPaceCard } from './BudgetPaceCard'
import { ExplainableInsight } from './ExplainableInsight'
import { NetWorthCard } from './NetWorthCard'
import { RecentTransactions } from './RecentTransactions'
import { UpcomingTimeline } from './UpcomingTimeline'
import { useRealHome } from './useRealHome'
import { Card } from '../../components/Card'
import { Skeleton } from '../../components/states/Skeleton'
import { UndoBar } from '../../components/UndoBar'
import { CONTEXT_DATE, alertsCount, syncedAt, undoBanner } from '../../data/demo'
import { formatMonthYearLong, formatWeekdayDate } from '../../lib/format'
import { useAuthStore } from '../../lib/supabase/useAuth'
import { useRealAccounts } from '../accounts/useRealAccounts'
import { ManualEntryPanel, type ManualEntryPanelMode } from '../accounts/ManualEntryPanel'
import { periodStartIso, type NetWorthPeriod } from '../accounts/netWorthHistory'
import { useNetWorthHistory } from '../accounts/useNetWorthHistory'
import { addManualTransaction, createManualAccount } from '../accounts/useManualEntries'
import { useRealCategories } from '../transactions/useRealCategories'
import { useRealSettings } from '../settings/useRealSettings'
import { useHomeUIStore, type ViewMode } from '../../store/useHomeUIStore'

const PERIODS: NetWorthPeriod[] = ['Mes actual', '3 meses', 'Año', 'Personalizado']
const VIEW_MODES: { value: ViewMode; label: string }[] = [
  { value: 'resumen', label: 'Resumen' },
  { value: 'detalle', label: 'Detalle' },
]

function Header({
  isAuthenticated,
  today,
  alertCount,
  loading = false,
  period,
  onPeriodChange,
  customFrom,
  onCustomFromChange,
  onAddManualMovement,
}: {
  isAuthenticated: boolean
  today: Date
  alertCount: number
  loading?: boolean
  period: NetWorthPeriod
  onPeriodChange: (p: NetWorthPeriod) => void
  customFrom: string
  onCustomFromChange: (v: string) => void
  onAddManualMovement: () => void
}) {
  const mode = useHomeUIStore((s) => s.mode)
  const setMode = useHomeUIStore((s) => s.setMode)

  const dateLabel = `${formatWeekdayDate(today)} · ${formatMonthYearLong(today.getMonth(), today.getFullYear())}`

  return (
    <header className="flex flex-col gap-4 border-b border-line bg-surface px-4 py-5 lg:px-6 lg:py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-[32px] lg:text-[26px] font-semibold tracking-[-0.01em] text-ink">Inicio</h1>
          <div className="mt-1 text-base text-ink-muted">{dateLabel}</div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {loading ? (
            <div className="flex min-h-11 items-center gap-2 rounded-md border border-line bg-canvas px-3 py-2 text-sm font-semibold text-ink-muted">
              Cargando tus datos…
            </div>
          ) : (
            <div className="flex min-h-11 items-center gap-2 rounded-md border border-green-soft-line bg-green-soft px-3 py-2 text-sm font-semibold text-green-text">
              <span aria-hidden="true">✓</span> {isAuthenticated ? 'Sincronizado' : `Sincronizado · ${syncedAt}`}
            </div>
          )}
          {alertCount > 0 && (
            <button
              type="button"
              onClick={() => document.getElementById('necesita-tu-atencion')?.scrollIntoView({ behavior: 'auto', block: 'start' })}
              className="flex min-h-11 items-center gap-2 rounded-md border border-line bg-surface px-3.5 py-2.5 text-base font-semibold text-ink hover:border-ink"
            >
              Avisos
              <span className="rounded-full bg-danger px-2 py-0.5 text-[13px] font-bold text-surface">{alertCount}</span>
            </button>
          )}
          <button
            type="button"
            onClick={isAuthenticated ? onAddManualMovement : undefined}
            className="min-h-11 rounded-md border border-brand bg-brand px-[18px] py-2.5 text-base font-semibold text-surface hover:bg-brand-hover"
          >
            Añadir movimiento
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[13px] font-semibold tracking-[0.08em] text-ink-muted uppercase">Periodo</span>
          <div className="flex flex-wrap gap-1 rounded-md border border-line bg-canvas p-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onPeriodChange(p)}
                aria-pressed={period === p}
                className={`min-h-11 rounded-sm px-3.5 py-2 text-[15px] font-semibold ${
                  period === p ? 'border border-line bg-surface text-ink' : 'border border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          {isAuthenticated && period === 'Personalizado' && (
            <label className="flex items-center gap-2 text-[15px] text-ink-muted">
              Desde
              <input
                type="date"
                value={customFrom}
                onChange={(e) => onCustomFromChange(e.target.value)}
                className="min-h-11 rounded-md border border-line bg-surface px-2.5 text-[15px] text-ink"
              />
            </label>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-[13px] font-semibold tracking-[0.08em] text-ink-muted uppercase">Vista</span>
          <div className="flex gap-1 rounded-md border border-line bg-canvas p-1">
            {VIEW_MODES.map((v) => (
              <button
                key={v.value}
                type="button"
                onClick={() => setMode(v.value)}
                aria-pressed={mode === v.value}
                className={`min-h-11 rounded-sm px-[18px] py-2 text-[15px] ${
                  mode === v.value
                    ? 'border border-brand bg-surface font-bold text-brand-text'
                    : 'border border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}

/** Pantalla Inicio completa, modos Resumen y Detalle. */
export function HomePage() {
  const isDetalle = useHomeUIStore((s) => s.mode === 'detalle')
  const session = useAuthStore((s) => s.session)
  const isAuthenticated = session !== null
  const { loading: loadingSettings, settings: realSettings } = useRealSettings()
  const budgetMonthStart = loadingSettings ? null : (realSettings?.budgetMonthStart ?? 1)
  const home = useRealHome(budgetMonthStart)
  const { accounts: realAccounts, refetch: refetchAccounts } = useRealAccounts()
  const { categories: realCategories } = useRealCategories()
  const [period, setPeriod] = useState<NetWorthPeriod>('Mes actual')
  const [customFrom, setCustomFrom] = useState('')
  const [manualPanelMode, setManualPanelMode] = useState<ManualEntryPanelMode>(null)

  const hasReal = isAuthenticated && home !== null
  // Autenticado pero home aún no resolvió: NUNCA mostrar la demo de relleno
  // aquí, aunque sea un instante — se ve un patrimonio/cifras que no son
  // las tuyas. Se muestra un estado de carga neutro en su lugar.
  const loadingReal = isAuthenticated && home === null
  const today = hasReal ? home!.today : CONTEXT_DATE
  const alertCount = hasReal ? home!.attentionItems.length : alertsCount

  const fromDateIso = hasReal ? periodStartIso(period, today, customFrom || undefined) : null
  const { points: netWorthHistory } = useNetWorthHistory(hasReal ? realAccounts : null, hasReal ? home!.netWorth : null, fromDateIso)

  if (loadingReal) {
    return (
      <>
        <Header
          isAuthenticated
          today={new Date()}
          alertCount={0}
          loading
          period={period}
          onPeriodChange={setPeriod}
          customFrom={customFrom}
          onCustomFromChange={setCustomFrom}
          onAddManualMovement={() => setManualPanelMode('movement')}
        />
        <main className="flex flex-1 flex-col gap-6 lg:gap-5 overflow-y-auto p-4 lg:p-6">
          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[1.25fr_1fr]">
            <Card className="flex flex-col gap-3" padding="lg">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-14 w-64" label="Cargando Disponible hoy…" />
              <Skeleton className="h-4 w-3/5" />
            </Card>
            <div className="flex flex-col gap-6">
              <Card className="flex flex-col gap-3" padding="md">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-48" label="Cargando patrimonio neto…" />
              </Card>
              <Card className="flex flex-col gap-3" padding="md">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-6 w-full" />
              </Card>
            </div>
          </div>
          <Card padding="lg">
            <Skeleton className="h-24 w-full" label="Cargando próximos pagos…" />
          </Card>
        </main>
      </>
    )
  }

  return (
    <>
      <Header
        isAuthenticated={isAuthenticated}
        today={today}
        alertCount={alertCount}
        period={period}
        onPeriodChange={setPeriod}
        customFrom={customFrom}
        onCustomFromChange={setCustomFrom}
        onAddManualMovement={() => setManualPanelMode('movement')}
      />
      <main className="flex flex-1 flex-col gap-6 lg:gap-5 overflow-y-auto p-4 lg:p-6">
        {hasReal && (
          <TodayCard
            headline={buildTodayHeadline({
              availableToday: home!.availableToday,
              eligibleAccountsSum: home!.eligibleAccountsSum,
              commitments14d: home!.commitments14d,
              monthExpense: home!.monthExpense,
            })}
            attentionItems={home!.attentionItems}
            today={today}
          />
        )}
        <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[1.25fr_1fr]">
          <div className="min-w-0">
            <AvailableTodayCard
              real={
                hasReal
                  ? {
                      availableToday: home!.availableToday,
                      eligibleAccounts: home!.eligibleAccounts,
                      eligibleAccountsSum: home!.eligibleAccountsSum,
                      commitments14d: home!.commitments14d,
                      commitmentsLabel: home!.commitmentsLabel,
                      outsideAvailable: home!.outsideAvailable,
                    }
                  : undefined
              }
            />
          </div>
          <div className="flex min-w-0 flex-col gap-6">
            <NetWorthCard
              real={
                hasReal
                  ? { netWorth: home!.netWorth, assets: home!.assets, liabilities: home!.liabilities, savingsRatePct: home!.savingsRatePct }
                  : undefined
              }
              history={hasReal ? netWorthHistory : undefined}
            />
            <BudgetPaceCard real={hasReal ? (home!.budgetVerdict ?? undefined) : undefined} />
          </div>
        </div>

        <UpcomingTimeline
          real={
            hasReal
              ? { events: home!.timelineEvents, days: home!.timelineDays, totalOut: home!.timelineTotalOut, rangeLabel: home!.timelineRangeLabel }
              : undefined
          }
        />

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          <div id="necesita-tu-atencion" className="min-w-0 scroll-mt-6">
            <AttentionTray real={hasReal ? home!.attentionItems : undefined} />
          </div>
          <div className="flex min-w-0 flex-col gap-6">
            {(!hasReal || home!.insight) && <ExplainableInsight real={hasReal ? (home!.insight ?? undefined) : undefined} />}
            <RecentTransactions
              real={hasReal ? { movements: home!.recentTransactions, totalThisMonth: home!.totalTransactionsThisMonth } : undefined}
            />
          </div>
        </div>

        {isDetalle && <BudgetBreakdownTable real={hasReal ? home!.budgetCategories : undefined} />}

        {!isAuthenticated && <UndoBar message={undoBanner.message} />}
      </main>
      <ManualEntryPanel
        mode={manualPanelMode}
        manualAccounts={realAccounts?.filter((a) => a.isManual) ?? []}
        categories={realCategories ?? []}
        onClose={() => setManualPanelMode(null)}
        onCreateAccount={createManualAccount}
        onAddMovement={addManualTransaction}
        onDone={() => {
          refetchAccounts()
          setManualPanelMode(null)
        }}
      />
    </>
  )
}
