import { useState } from 'react'
import { DebtsTable } from './DebtsTable'
import { EditDebtDetailPanel } from './EditDebtDetailPanel'
import { ExtraPaymentPanel } from './ExtraPaymentPanel'
import { RealStrategyComparisonCard } from './RealStrategyComparisonCard'
import { StrategyComparisonCard } from './StrategyComparisonCard'
import { useDebtsStore } from './store'
import { saveDebtDetails, saveExtraPaymentReminder, toDebtTableRow, useRealDebts } from './useRealDebts'
import { useRealAccounts } from '../accounts/useRealAccounts'
import { EmptyState } from '../../components/states/EmptyState'
import { LoadingRealData } from '../../components/states/LoadingRealData'
import { Money } from '../../components/Money'
import { totalDebt } from '../../data/debts'
import { useAuthStore } from '../../lib/supabase/useAuth'

function Header({
  isAuthenticated,
  hasRealDebts,
  totalCents,
  count,
}: {
  isAuthenticated: boolean
  hasRealDebts: boolean
  totalCents: number
  count: number
}) {
  const openSimulator = useDebtsStore((s) => s.openSimulator)
  const canSimulate = !isAuthenticated || hasRealDebts

  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line bg-surface px-4 py-5 lg:px-6 lg:py-4">
      <div>
        <h1 className="font-serif text-[32px] lg:text-[26px] font-semibold tracking-[-0.01em] text-ink">Deudas</h1>
        <div className="mt-1 text-base text-ink-muted tabular">
          {isAuthenticated ? (
            <Money value={totalCents / 100} />
          ) : (
            <Money value={totalDebt} />
          )}{' '}
          pendientes en {count} deuda{count === 1 ? '' : 's'}
        </div>
      </div>
      {canSimulate && (
        <button
          type="button"
          id="simular-pago-btn"
          onClick={openSimulator}
          className="min-h-11 rounded-md border border-brand bg-brand px-[18px] py-2.5 text-base font-semibold text-surface hover:bg-brand-hover"
        >
          Simular pago extraordinario
        </button>
      )}
    </header>
  )
}

/** Pantalla Deudas: tabla, comparación de estrategias, y simulador de pago extraordinario. */
export function DebtsPage() {
  const session = useAuthStore((s) => s.session)
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)

  const { loading: loadingAccounts, accounts: realAccounts } = useRealAccounts()
  const { loading: loadingDebts, debts: realDebts, refetch } = useRealDebts(realAccounts)

  const isAuthenticated = session !== null
  const loadingReal = loadingAccounts || loadingDebts
  const hasRealDebts = isAuthenticated && !loadingReal && realDebts !== null && realDebts.length > 0
  const today = new Date()

  const totalCents = realDebts?.reduce((sum, d) => sum + d.balanceCents, 0) ?? 0
  const editingDebt = realDebts?.find((d) => d.accountId === editingAccountId) ?? null

  async function handleSaveDetail(accountId: string, annualRateBps: number, monthlyPaymentCents: number | null, nextPaymentDate: string | null) {
    return saveDebtDetails(accountId, annualRateBps, monthlyPaymentCents, nextPaymentDate)
  }

  async function handleSaveReminder(accountId: string, note: string) {
    const error = await saveExtraPaymentReminder(accountId, note)
    if (!error) refetch()
    return error
  }

  return (
    <>
      <Header
        isAuthenticated={isAuthenticated}
        hasRealDebts={hasRealDebts}
        totalCents={totalCents}
        count={isAuthenticated ? (realDebts?.length ?? 0) : 4}
      />
      <main className="flex flex-1 flex-col gap-6 lg:gap-5 overflow-y-auto p-4 lg:p-6">
        {isAuthenticated && loadingReal ? (
          <LoadingRealData />
        ) : isAuthenticated && !loadingReal && realDebts?.length === 0 ? (
          <EmptyState
            headline="No tienes ninguna cuenta marcada como Deuda"
            body="Clasifica una cuenta como «Deuda» en Cuentas y patrimonio para verla aquí."
            action={{ label: 'Ir a Cuentas y patrimonio', to: '/cuentas' }}
          />
        ) : (
          <>
            <DebtsTable
              debts={hasRealDebts ? realDebts!.map(toDebtTableRow) : undefined}
              asOf={hasRealDebts ? today : undefined}
              syncNote={hasRealDebts ? null : undefined}
              onEditDetail={hasRealDebts ? setEditingAccountId : undefined}
            />
            {!isAuthenticated && <StrategyComparisonCard />}
            {hasRealDebts && <RealStrategyComparisonCard debts={realDebts!} />}
          </>
        )}
      </main>
      <ExtraPaymentPanel
        debts={hasRealDebts ? realDebts!.map(toDebtTableRow) : undefined}
        asOf={hasRealDebts ? today : undefined}
        onSaveReminder={hasRealDebts ? handleSaveReminder : undefined}
      />
      <EditDebtDetailPanel
        debt={editingDebt}
        onClose={() => setEditingAccountId(null)}
        onSave={handleSaveDetail}
        onDone={() => {
          refetch()
          setEditingAccountId(null)
        }}
      />
    </>
  )
}
