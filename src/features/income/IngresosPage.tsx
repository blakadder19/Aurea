import { useState } from 'react'
import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { EmptyState } from '../../components/states/EmptyState'
import { LoadingRealData } from '../../components/states/LoadingRealData'
import { UndoBar } from '../../components/UndoBar'
import { INCOME_TYPE_LABELS, useDeclaredIncomes } from '../../lib/declaredIncome'
import { useAuthStore } from '../../lib/supabase/useAuth'
import { DeclaredIncomesCard } from './DeclaredIncomesCard'
import { ReceivablesCard } from './ReceivablesCard'
import { unsettleReceivable, useRealReceivables } from './useRealReceivables'

function Header() {
  return (
    <header className="flex flex-col gap-1 border-b border-line bg-surface px-4 py-5 lg:px-6 lg:py-4">
      <h1 className="font-serif text-[32px] lg:text-[26px] font-semibold tracking-[-0.01em] text-ink">Ingresos</h1>
      <div className="text-base text-ink-muted">Todo lo que entra que Áurea no ve por sí sola en tus movimientos, y lo que te deben</div>
    </header>
  )
}

/** Desglose por tipo de los ingresos declarados activos — no incluye lo ya detectado en movimientos (eso ya se ve en Inicio/Informes). */
function IncomeTypeBreakdown({ incomes }: { incomes: { amountCents: number; active: boolean; incomeType: string | null }[] }) {
  const active = incomes.filter((i) => i.active)
  if (active.length === 0) return null

  const byType = new Map<string, number>()
  for (const i of active) {
    const key = i.incomeType ?? 'sin_tipo'
    byType.set(key, (byType.get(key) ?? 0) + i.amountCents)
  }
  const rows = [...byType.entries()].sort(([, a], [, b]) => b - a)
  const totalCents = active.reduce((sum, i) => sum + i.amountCents, 0)

  return (
    <Card padding="lg" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-[22px] lg:text-[19px] font-semibold text-ink">Por tipo, al mes</h2>
        <Money value={totalCents / 100} decimals={0} serif className="text-[22px] font-semibold text-ink" />
      </div>
      <div className="flex flex-col gap-2">
        {rows.map(([type, cents]) => (
          <div key={type} className="flex items-center justify-between text-[15px]">
            <span className="font-semibold text-ink">{type === 'sin_tipo' ? 'Sin especificar' : INCOME_TYPE_LABELS[type as keyof typeof INCOME_TYPE_LABELS]}</span>
            <Money value={cents / 100} decimals={0} className="text-ink" />
          </div>
        ))}
      </div>
    </Card>
  )
}

/** Pantalla Ingresos: ingresos declarados a mano (por tipo) y dinero que te deben — real-only, sin demo. */
export function IngresosPage() {
  const session = useAuthStore((s) => s.session)
  const isAuthenticated = session !== null
  const { loading: loadingIncomes, incomes: declaredIncomes, refetch: refetchIncomes } = useDeclaredIncomes()
  const { loading: loadingReceivables, receivables, refetch: refetchReceivables } = useRealReceivables()
  const [pendingSettle, setPendingSettle] = useState<{ id: string; message: string } | null>(null)

  function handleSettled(id: string, message: string) {
    setPendingSettle({ id, message })
    refetchReceivables()
  }

  async function handleUndoSettle() {
    if (!pendingSettle) return
    await unsettleReceivable(pendingSettle.id)
    setPendingSettle(null)
    refetchReceivables()
  }

  if (!isAuthenticated) {
    return (
      <>
        <Header />
        <main className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
          <EmptyState
            headline="Inicia sesión para ver tus ingresos"
            body="Aquí puedes declarar ingresos que Áurea no ve en tus movimientos (por tipo) y llevar la cuenta de lo que te deben."
            action={{ label: 'Ir a Ajustes', to: '/ajustes' }}
          />
        </main>
      </>
    )
  }

  const loading = loadingIncomes || loadingReceivables

  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col gap-6 lg:gap-5 overflow-y-auto p-4 lg:p-6">
        {loading ? (
          <LoadingRealData />
        ) : (
          <>
            <IncomeTypeBreakdown incomes={declaredIncomes ?? []} />
            <DeclaredIncomesCard incomes={declaredIncomes ?? []} onRefetch={refetchIncomes} />
            <ReceivablesCard receivables={receivables ?? []} onRefetch={refetchReceivables} onSettled={handleSettled} />
            {pendingSettle && <UndoBar message={pendingSettle.message} onUndo={handleUndoSettle} />}
          </>
        )}
      </main>
    </>
  )
}
