import { useState } from 'react'
import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { ProgressBar } from '../../components/ProgressBar'
import { EmptyState } from '../../components/states/EmptyState'
import { LoadingRealData } from '../../components/states/LoadingRealData'
import { demoMonthlyReport } from '../../data/reports'
import { categoryColorClass } from '../../lib/categoryColor'
import { formatMoneySigned, formatPercentSigned } from '../../lib/format'
import { useAuthStore } from '../../lib/supabase/useAuth'
import type { MonthlyReport } from './reportCalc'
import { useRealMonthlyReport } from './useRealMonthlyReport'

const euros = (cents: number) => cents / 100

const MONTH_CHOICES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

function monthChoiceLabel(monthsAgo: number, today: Date): string {
  const d = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1)
  const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${MONTHS[d.getMonth()]} de ${d.getFullYear()}`
}

function Header({
  isAuthenticated,
  monthsAgo,
  onMonthsAgoChange,
}: {
  isAuthenticated: boolean
  monthsAgo: number
  onMonthsAgoChange: (n: number) => void
}) {
  const today = new Date()
  return (
    <header className="flex flex-col gap-4 border-b border-line bg-surface px-4 py-5 lg:px-6 lg:py-4">
      <div>
        <h1 className="font-serif text-[32px] lg:text-[26px] font-semibold tracking-[-0.01em] text-ink">Informes</h1>
        <div className="mt-1 text-base text-ink-muted">
          {isAuthenticated ? 'El cierre de cada mes: ingresos, gastos y en qué se fue tu dinero' : 'Ejemplo del informe de cierre de mes'}
        </div>
      </div>
      {isAuthenticated && (
        <label className="flex flex-wrap items-center gap-2.5">
          <span className="text-[13px] font-semibold tracking-[0.08em] text-ink-muted uppercase">Mes</span>
          <select
            value={monthsAgo}
            onChange={(e) => onMonthsAgoChange(Number(e.target.value))}
            className="min-h-11 rounded-md border border-line bg-surface px-3.5 text-base text-ink"
          >
            {MONTH_CHOICES.map((n) => (
              <option key={n} value={n}>
                {monthChoiceLabel(n, today)}
              </option>
            ))}
          </select>
        </label>
      )}
    </header>
  )
}

function ReportBody({ report }: { report: MonthlyReport }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Card className="flex flex-col gap-2.5" padding="lg">
          <div className="text-[13px] font-semibold tracking-[0.08em] text-ink-muted uppercase">Ingresos</div>
          <Money value={euros(report.incomeCents)} decimals={0} serif className="text-[32px] font-semibold" />
        </Card>
        <Card className="flex flex-col gap-2.5" padding="lg">
          <div className="text-[13px] font-semibold tracking-[0.08em] text-ink-muted uppercase">Gastos</div>
          <Money value={euros(report.expenseCents)} decimals={0} serif className="text-[32px] font-semibold" />
          {report.expenseDeltaCents !== null && (
            <div className={`text-sm font-semibold ${report.expenseDeltaCents <= 0 ? 'text-green-text' : 'text-danger-text'}`}>
              {report.expenseDeltaCents <= 0 ? '▼' : '▲'} {formatMoneySigned(euros(report.expenseDeltaCents), 0)}
              {report.expenseDeltaPct !== null && ` (${formatPercentSigned(report.expenseDeltaPct)})`} vs. el mes anterior
            </div>
          )}
        </Card>
        <Card tone="green-soft" className="flex flex-col gap-2.5" padding="lg">
          <div className="text-[13px] font-semibold tracking-[0.08em] text-green-text uppercase">Ahorro neto</div>
          <Money value={euros(report.netCents)} decimals={0} serif className="text-[32px] font-semibold" />
          <div className="text-sm font-semibold text-green-text">
            {report.savingsRatePct === null ? 'Sin ingresos registrados este mes' : `Tasa de ahorro: ${formatPercentSigned(report.savingsRatePct)}`}
          </div>
        </Card>
      </div>

      <Card padding="lg" className="flex flex-col gap-4">
        <h2 className="font-serif text-[22px] lg:text-[19px] font-semibold text-ink">Gasto por categoría</h2>
        {report.categories.length === 0 ? (
          <p className="text-base text-ink-muted">No hubo gasto categorizado este mes.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {report.categories.map((c) => (
              <div key={c.name} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${categoryColorClass(c.name)}`} aria-hidden="true" />
                    <span className="truncate text-[15px] font-semibold text-ink">{c.name}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 tabular">
                    <Money value={euros(c.spentCents)} decimals={0} className="text-[15px] font-semibold" />
                    <span className="text-sm text-ink-muted">{c.pctOfTotal.toFixed(0)} %</span>
                  </div>
                </div>
                <ProgressBar percent={c.pctOfTotal} fillClassName={categoryColorClass(c.name)} heightPx={8} label={`${c.name}: ${c.pctOfTotal.toFixed(0)} % del gasto`} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  )
}

/** Pantalla Informes: cierre de un mes ya pasado — ingresos, gastos, ahorro y gasto por categoría. */
export function ReportsPage() {
  const session = useAuthStore((s) => s.session)
  const isAuthenticated = session !== null
  const [monthsAgo, setMonthsAgo] = useState(1)
  const { loading, report: realReport } = useRealMonthlyReport(monthsAgo)

  const report = isAuthenticated ? realReport : demoMonthlyReport

  return (
    <>
      <Header isAuthenticated={isAuthenticated} monthsAgo={monthsAgo} onMonthsAgoChange={setMonthsAgo} />
      <main className="flex flex-1 flex-col gap-6 lg:gap-5 overflow-y-auto p-4 lg:p-6">
        {isAuthenticated && loading ? (
          <LoadingRealData />
        ) : report === null ? (
          <EmptyState
            headline="No hay movimientos en ese mes"
            body="Prueba con otro mes, o comprueba que tu banco esté sincronizado en Cuentas y patrimonio."
            action={{ label: 'Ver el mes anterior', onClick: () => setMonthsAgo((m) => m + 1) }}
          />
        ) : (
          <ReportBody report={report} />
        )}
      </main>
    </>
  )
}
