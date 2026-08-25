import { useState } from 'react'
import { AccountDetailPanel } from './AccountDetailPanel'
import { AccountsTable } from './AccountsTable'
import { DetailBreakdowns } from './DetailBreakdowns'
import { NetWorthKpis } from './NetWorthKpis'
import { updateAccountFunction, updateAccountSharePercent, useRealAccounts } from './useRealAccounts'
import type { AccountFunction } from '../../data/accounts'
import { startBankConnection } from '../settings/bankConnection'
import { useAccountsStore, type AccountsView } from './store'
import { CONTEXT_DATE, syncedAt } from '../../data/demo'
import { formatMonthYearLong, formatWeekdayDate } from '../../lib/format'
import { EmptyState } from '../../components/states/EmptyState'
import { SyncingNotice } from '../../components/states/SyncingNotice'
import { connections } from '../../data/settings'
import { useAuthStore } from '../../lib/supabase/useAuth'
import { useSettingsStore } from '../settings/store'

const revolutBase = connections.find((c) => c.id === 'revolut')!

const PERIODS = ['Mes actual', '3 meses', 'Año', 'Personalizado']
const VIEWS: { value: AccountsView; label: string }[] = [
  { value: 'resumen', label: 'Resumen' },
  { value: 'detalle', label: 'Detalle' },
]

function Header() {
  const mode = useAccountsStore((s) => s.mode)
  const setMode = useAccountsStore((s) => s.setMode)
  const [period, setPeriod] = useState(PERIODS[0])

  const dateLabel = `${formatWeekdayDate(CONTEXT_DATE)} · ${formatMonthYearLong(
    CONTEXT_DATE.getMonth(),
    CONTEXT_DATE.getFullYear(),
  )}`

  return (
    <header className="flex flex-col gap-4 border-b border-line bg-surface px-4 py-5 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-[32px] font-semibold tracking-[-0.01em] text-ink">Cuentas y patrimonio</h1>
          <div className="mt-1 text-base text-ink-muted">{dateLabel}</div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-h-11 items-center gap-2 rounded-md border border-green-soft-line bg-green-soft px-3 py-2 text-sm font-semibold text-green-text">
            <span aria-hidden="true">✓</span> Sincronizado · {syncedAt}
          </div>
          <button
            type="button"
            className="min-h-11 rounded-md border border-brand bg-brand px-[18px] py-2.5 text-base font-semibold text-surface hover:bg-brand-hover"
          >
            Añadir cuenta
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
                onClick={() => setPeriod(p)}
                aria-pressed={period === p}
                className={`min-h-11 rounded-sm px-3.5 py-2 text-[15px] font-semibold ${
                  period === p ? 'border border-line bg-surface text-ink' : 'border border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
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
  const [connectError, setConnectError] = useState<string | null>(null)

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

  const isAuthenticated = session !== null
  const hasRealAccounts = isAuthenticated && !loadingReal && realAccounts !== null && realAccounts.length > 0

  // Sin tipo de cambio fiable no consolidamos divisas: las cuentas en otra
  // moneda quedan fuera del total y se avisa de cuántas se han excluido.
  const excludedForeignCount = hasRealAccounts
    ? realAccounts!.filter((a) => a.currency !== undefined && a.currency !== 'EUR').length
    : 0

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

  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 lg:p-8">
        {!isAuthenticated && revolutStatus === 'syncing' && (
          <SyncingNotice accountLabel="Revolut" body="Puede tardar hasta un minuto. Las demás cuentas ya están actualizadas." />
        )}

        {isAuthenticated && !loadingReal && realAccounts?.length === 0 ? (
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
              excludedForeignCount={excludedForeignCount}
            />
            <AccountsTable accounts={hasRealAccounts ? realAccounts! : undefined} />
            {isDetalle && !isAuthenticated && <DetailBreakdowns />}
          </>
        )}
      </main>
      <AccountDetailPanel
        accounts={hasRealAccounts ? realAccounts! : undefined}
        onChangeFunction={hasRealAccounts ? handleChangeFunction : undefined}
        onChangeSharePercent={hasRealAccounts ? handleChangeSharePercent : undefined}
      />
    </>
  )
}
