import { useState } from 'react'
import { AccountDetailPanel } from './AccountDetailPanel'
import { AccountsTable } from './AccountsTable'
import { DetailBreakdowns } from './DetailBreakdowns'
import { ManualEntryPanel, type ManualEntryPanelMode } from './ManualEntryPanel'
import { NetWorthKpis, type ForeignBalance } from './NetWorthKpis'
import { NetWorthTrendChart } from './NetWorthTrendChart'
import { RealDetailBreakdowns } from './RealDetailBreakdowns'
import { periodStartIso, type NetWorthPeriod } from './netWorthHistory'
import { useNetWorthHistory } from './useNetWorthHistory'
import { addManualTransaction, createManualAccount, deleteManualAccount } from './useManualEntries'
import { updateAccountDisplayName, updateAccountFunction, updateAccountSharePercent, useRealAccounts } from './useRealAccounts'
import type { AccountFunction } from '../../data/accounts'
import { startBankConnection } from '../settings/bankConnection'
import { useAccountsStore, type AccountsView } from './store'
import { CONTEXT_DATE, syncedAt } from '../../data/demo'
import { formatMonthYearLong, formatWeekdayDate } from '../../lib/format'
import { EmptyState } from '../../components/states/EmptyState'
import { LoadingRealData } from '../../components/states/LoadingRealData'
import { SyncingNotice } from '../../components/states/SyncingNotice'
import { connections } from '../../data/settings'
import { formatIsoDateTime } from '../../lib/format'
import { useAuthStore } from '../../lib/supabase/useAuth'
import { useSettingsStore } from '../settings/store'
import { useRealConnections, latestSync } from '../settings/useRealConnections'

const revolutBase = connections.find((c) => c.id === 'revolut')!

const PERIODS: NetWorthPeriod[] = ['Mes actual', '3 meses', 'Año', 'Personalizado']
const VIEWS: { value: AccountsView; label: string }[] = [
  { value: 'resumen', label: 'Resumen' },
  { value: 'detalle', label: 'Detalle' },
]

function Header({
  isAuthenticated,
  realLastSynced,
  period,
  onPeriodChange,
  customFrom,
  onCustomFromChange,
  onAddManualAccount,
}: {
  isAuthenticated: boolean
  realLastSynced: string | null
  period: NetWorthPeriod
  onPeriodChange: (p: NetWorthPeriod) => void
  customFrom: string
  onCustomFromChange: (v: string) => void
  onAddManualAccount: () => void
}) {
  const mode = useAccountsStore((s) => s.mode)
  const setMode = useAccountsStore((s) => s.setMode)

  const dateLabel = `${formatWeekdayDate(CONTEXT_DATE)} · ${formatMonthYearLong(
    CONTEXT_DATE.getMonth(),
    CONTEXT_DATE.getFullYear(),
  )}`

  return (
    <header className="flex flex-col gap-4 border-b border-line bg-surface px-4 py-5 lg:px-6 lg:py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-[32px] lg:text-[26px] font-semibold tracking-[-0.01em] text-ink">Cuentas y patrimonio</h1>
          <div className="mt-1 text-base text-ink-muted">{dateLabel}</div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {(!isAuthenticated || realLastSynced) && (
            <div className="flex min-h-11 items-center gap-2 rounded-md border border-green-soft-line bg-green-soft px-3 py-2 text-sm font-semibold text-green-text">
              <span aria-hidden="true">✓</span> Sincronizado ·{' '}
              {isAuthenticated ? formatIsoDateTime(realLastSynced!) : syncedAt}
            </div>
          )}
          <button
            type="button"
            onClick={isAuthenticated ? onAddManualAccount : undefined}
            className="min-h-11 rounded-md border border-brand bg-brand px-[18px] py-2.5 text-base font-semibold text-surface hover:bg-brand-hover"
          >
            {isAuthenticated ? 'Añadir cuenta manual' : 'Añadir cuenta'}
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
      </div>
    </header>
  )
}

/** Pantalla Cuentas y patrimonio: KPIs, tabla de cuentas y desgloses en Detalle. */
export function AccountsPage() {
  const isDetalle = useAccountsStore((s) => s.mode === 'detalle')
  const revolutStatus = useSettingsStore((s) => s.connectionOverrides.revolut?.status ?? revolutBase.status)
  const session = useAuthStore((s) => s.session)
  const { loading: loadingReal, accounts: realAccounts, refetch } = useRealAccounts()
  const { connections: realConnections } = useRealConnections()
  const [connectError, setConnectError] = useState<string | null>(null)
  const [period, setPeriod] = useState<NetWorthPeriod>('Mes actual')
  const [customFrom, setCustomFrom] = useState('')
  const [manualPanelMode, setManualPanelMode] = useState<ManualEntryPanelMode>(null)

  async function handleConnectBank() {
    setConnectError(null)
    const error = await startBankConnection()
    if (error) setConnectError(error)
  }

  async function handleChangeFunction(accountId: string, fn: AccountFunction) {
    const error = await updateAccountFunction(accountId, fn)
    if (!error) refetch()
    return error
  }

  async function handleChangeSharePercent(accountId: string, percent: number) {
    const error = await updateAccountSharePercent(accountId, percent)
    if (!error) refetch()
    return error
  }

  async function handleDeleteManualAccount(accountId: string) {
    const error = await deleteManualAccount(accountId)
    if (!error) refetch()
    return error
  }

  async function handleRenameAccount(accountId: string, displayName: string) {
    const error = await updateAccountDisplayName(accountId, displayName)
    if (!error) refetch()
    return error
  }

  const isAuthenticated = session !== null
  const hasRealAccounts = isAuthenticated && !loadingReal && realAccounts !== null && realAccounts.length > 0

  // Sin tipo de cambio fiable no consolidamos divisas en el total en euros —
  // pero eso no significa esconderlas: se muestra el subtotal real de cada
  // una, tal cual, nunca convertido a un EUR inventado.
  const foreignBalances: ForeignBalance[] = hasRealAccounts
    ? [...realAccounts!.filter((a) => a.currency !== undefined && a.currency !== 'EUR').reduce((acc, a) => {
        const share = a.balance * ((a.sharePercent ?? 100) / 100)
        acc.set(a.currency!, (acc.get(a.currency!) ?? 0) + share)
        return acc
      }, new Map<string, number>())].map(([currency, amount]) => ({ currency, amount }))
    : []

  const realKpis = hasRealAccounts
    ? realAccounts!
        .filter((a) => a.currency === undefined || a.currency === 'EUR')
        .reduce(
          (acc, a) => {
            const share = a.balance * ((a.sharePercent ?? 100) / 100)
            return share >= 0 ? { ...acc, assets: acc.assets + share } : { ...acc, liabilities: acc.liabilities - share }
          },
          { assets: 0, liabilities: 0 },
        )
    : null
  const realNetWorth = realKpis ? realKpis.assets - realKpis.liabilities : null

  const fromDateIso = hasRealAccounts ? periodStartIso(period, new Date(), customFrom || undefined) : null
  const { loading: loadingHistory, points: netWorthHistory } = useNetWorthHistory(
    hasRealAccounts ? realAccounts : null,
    realNetWorth,
    fromDateIso,
  )

  return (
    <>
      <Header
        isAuthenticated={isAuthenticated}
        realLastSynced={latestSync(realConnections ?? [])}
        period={period}
        onPeriodChange={setPeriod}
        customFrom={customFrom}
        onCustomFromChange={setCustomFrom}
        onAddManualAccount={() => setManualPanelMode('account')}
      />
      <main className="flex flex-1 flex-col gap-6 lg:gap-5 overflow-y-auto p-4 lg:p-6">
        {!isAuthenticated && revolutStatus === 'syncing' && (
          <SyncingNotice accountLabel="Revolut" body="Puede tardar hasta un minuto. Las demás cuentas ya están actualizadas." />
        )}

        {isAuthenticated && loadingReal ? (
          <LoadingRealData />
        ) : isAuthenticated && !loadingReal && realAccounts?.length === 0 ? (
          <EmptyState
            headline="Todavía no has conectado ningún banco"
            body="Conecta tu banco para ver aquí tus cuentas y tu patrimonio real."
            action={{ label: 'Conectar mi banco', onClick: () => void handleConnectBank() }}
            error={connectError}
          />
        ) : (
          <>
            <NetWorthKpis
              kpis={hasRealAccounts ? { ...realKpis!, netWorth: realKpis!.assets - realKpis!.liabilities } : undefined}
              foreignBalances={foreignBalances}
            />
            {hasRealAccounts && <NetWorthTrendChart points={netWorthHistory} loading={loadingHistory} />}
            <AccountsTable accounts={hasRealAccounts ? realAccounts! : undefined} />
            {isDetalle && !isAuthenticated && <DetailBreakdowns />}
            {isDetalle && hasRealAccounts && <RealDetailBreakdowns accounts={realAccounts!} />}
          </>
        )}
      </main>
      <AccountDetailPanel
        accounts={hasRealAccounts ? realAccounts! : undefined}
        onChangeFunction={hasRealAccounts ? handleChangeFunction : undefined}
        onChangeSharePercent={hasRealAccounts ? handleChangeSharePercent : undefined}
        onDeleteManual={hasRealAccounts ? handleDeleteManualAccount : undefined}
        onRename={hasRealAccounts ? handleRenameAccount : undefined}
      />
      <ManualEntryPanel
        mode={manualPanelMode}
        manualAccounts={realAccounts?.filter((a) => a.isManual) ?? []}
        categories={[]}
        onClose={() => setManualPanelMode(null)}
        onCreateAccount={createManualAccount}
        onAddMovement={addManualTransaction}
        onDone={() => {
          refetch()
          setManualPanelMode(null)
        }}
      />
    </>
  )
}
