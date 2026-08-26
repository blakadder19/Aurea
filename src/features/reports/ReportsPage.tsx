import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { ProgressBar } from '../../components/ProgressBar'
import { EmptyState } from '../../components/states/EmptyState'
import { LoadingRealData } from '../../components/states/LoadingRealData'
import { demoMonthlyReport } from '../../data/reports'
import { categoryColorClass } from '../../lib/categoryColor'
import { formatMoneySigned, formatPercentSigned } from '../../lib/format'
import { useAuthStore } from '../../lib/supabase/useAuth'
import { ALL_CATEGORIES, useTransactionsStore } from '../transactions/store'
import { categoryLabel, useRealCategories } from '../transactions/useRealCategories'
import { MonthlyTrendChart } from './MonthlyTrendChart'
import type { CategorySpend, MonthlyReport } from './reportCalc'
import type { CategoryTrendResult } from './categoryTrendCalc'
import { useCategoryTrend } from './useCategoryTrend'
import { useMonthlyTrend } from './useMonthlyTrend'
import { useRealMonthlyReport } from './useRealMonthlyReport'

const euros = (cents: number) => cents / 100

const MONTH_CHOICES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

function monthChoiceLabel(monthsAgo: number, today: Date): string {
  const d = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1)
  const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${MONTHS[d.getMonth()]} de ${d.getFullYear()}`
}

/** "2026-07" del mes que muestra el informe — para preseleccionar el filtro de fecha al ir a Movimientos. */
function monthIsoFor(monthsAgo: number, today: Date): string {
  const d = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
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

function ViewMovementsLink({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-sm font-semibold text-brand underline hover:no-underline">
      Ver movimientos
    </button>
  )
}

function MerchantsCard({ merchants, onViewMovements }: { merchants: MonthlyReport['merchants']; onViewMovements: () => void }) {
  if (merchants.length === 0) return null
  return (
    <Card padding="lg" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-[22px] lg:text-[19px] font-semibold text-ink">Por comercio</h2>
        <ViewMovementsLink onClick={onViewMovements} />
      </div>
      <div className="flex flex-col gap-4">
        {merchants.map((m) => (
          <div key={m.name} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-[15px] font-semibold text-ink">{m.name}</span>
              <div className="flex shrink-0 items-center gap-2 tabular">
                <Money value={euros(m.spentCents)} decimals={0} className="text-[15px] font-semibold" />
                <span className="text-sm text-ink-muted">{m.pctOfTotal.toFixed(0)} %</span>
              </div>
            </div>
            <ProgressBar percent={m.pctOfTotal} fillClassName="bg-ink-faint" heightPx={6} label={`${m.name}: ${m.pctOfTotal.toFixed(0)} % del gasto`} />
          </div>
        ))}
      </div>
    </Card>
  )
}

function CategoryTrendCard({ trend, loading }: { trend: CategoryTrendResult | null; loading: boolean }) {
  if (loading) {
    return (
      <Card padding="lg" className="flex flex-col gap-4">
        <h2 className="font-serif text-[22px] lg:text-[19px] font-semibold text-ink">Evolución por categoría</h2>
        <p className="text-base text-ink-muted">Cargando…</p>
      </Card>
    )
  }
  if (!trend || trend.rows.length === 0) return null

  return (
    <Card padding="lg" className="flex flex-col gap-4">
      <h2 className="font-serif text-[22px] lg:text-[19px] font-semibold text-ink">Evolución por categoría</h2>
      <p className="text-sm text-ink-muted">Las categorías con más gasto de los últimos {trend.monthLabels.length} meses cerrados.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse tabular">
          <thead>
            <tr>
              <th className="border-b border-line px-2 py-2 text-left text-[13px] font-semibold tracking-[0.06em] text-ink-muted uppercase">Categoría</th>
              {trend.monthLabels.map((label) => (
                <th key={label} className="border-b border-line px-2 py-2 text-right text-[13px] font-semibold tracking-[0.06em] text-ink-muted uppercase">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trend.rows.map((row) => (
              <tr key={row.categoryId ?? '__sin_clasificar__'}>
                <td className="flex items-center gap-2 border-b border-line px-2 py-2.5 text-[15px] font-semibold text-ink">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${categoryColorClass(row.name)}`} aria-hidden="true" />
                  {row.name}
                </td>
                {row.spentCentsByMonth.map((cents, i) => (
                  <td key={trend.monthLabels[i]} className="border-b border-line px-2 py-2.5 text-right text-[15px] text-ink">
                    {cents > 0 ? <Money value={euros(cents)} decimals={0} /> : <span className="text-ink-faint">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function ReportBody({
  report,
  categoryLabelById,
  onViewMovements,
  categoryTrend,
  loadingCategoryTrend,
}: {
  report: MonthlyReport
  categoryLabelById: Map<string, string>
  onViewMovements: (categoryFilterValue: string) => void
  categoryTrend: CategoryTrendResult | null
  loadingCategoryTrend: boolean
}) {
  // categoryId es null tanto para "Sin clasificar" en real (donde `name` ya vale eso)
  // como para toda categoría de demo (que no tiene id real) — en ambos casos, `name` ya es el valor correcto a filtrar.
  function categoryFilterValueFor(c: CategorySpend): string {
    return c.categoryId ? (categoryLabelById.get(c.categoryId) ?? c.name) : c.name
  }

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
          {report.yearExpenseDeltaCents !== null && (
            <div className={`text-sm font-semibold ${report.yearExpenseDeltaCents <= 0 ? 'text-green-text' : 'text-danger-text'}`}>
              {report.yearExpenseDeltaCents <= 0 ? '▼' : '▲'} {formatMoneySigned(euros(report.yearExpenseDeltaCents), 0)}
              {report.yearExpenseDeltaPct !== null && ` (${formatPercentSigned(report.yearExpenseDeltaPct)})`} vs. el mismo mes, año anterior
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
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-[22px] lg:text-[19px] font-semibold text-ink">Gasto por categoría</h2>
          <ViewMovementsLink onClick={() => onViewMovements(ALL_CATEGORIES)} />
        </div>
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
                    <button
                      type="button"
                      onClick={() => onViewMovements(categoryFilterValueFor(c))}
                      className="text-sm font-semibold text-brand underline hover:no-underline"
                    >
                      Ver
                    </button>
                  </div>
                </div>
                <ProgressBar percent={c.pctOfTotal} fillClassName={categoryColorClass(c.name)} heightPx={8} label={`${c.name}: ${c.pctOfTotal.toFixed(0)} % del gasto`} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <MerchantsCard merchants={report.merchants} onViewMovements={() => onViewMovements(ALL_CATEGORIES)} />
      <CategoryTrendCard trend={categoryTrend} loading={loadingCategoryTrend} />
    </>
  )
}

/** Pantalla Informes: cierre de un mes ya pasado — ingresos, gastos, ahorro y gasto por categoría. */
export function ReportsPage() {
  const navigate = useNavigate()
  const session = useAuthStore((s) => s.session)
  const isAuthenticated = session !== null
  const [monthsAgo, setMonthsAgo] = useState(1)
  const { loading, report: realReport } = useRealMonthlyReport(monthsAgo)
  const { loading: loadingTrend, points: trendPoints } = useMonthlyTrend()
  const { categories: realCategories } = useRealCategories()
  const { loading: loadingCategoryTrend, result: categoryTrend } = useCategoryTrend()

  const setDateFilter = useTransactionsStore((s) => s.setDateFilter)
  const setCategoryFilter = useTransactionsStore((s) => s.setCategoryFilter)
  const setSearchQuery = useTransactionsStore((s) => s.setSearchQuery)

  const report = isAuthenticated ? realReport : demoMonthlyReport
  const categoryLabelById = new Map((realCategories ?? []).map((c) => [c.id, categoryLabel(c)]))

  function handleViewMovements(categoryFilterValue: string) {
    setDateFilter(monthIsoFor(monthsAgo, new Date()))
    setCategoryFilter(categoryFilterValue)
    setSearchQuery('')
    navigate('/movimientos')
  }

  return (
    <>
      <Header isAuthenticated={isAuthenticated} monthsAgo={monthsAgo} onMonthsAgoChange={setMonthsAgo} />
      <main className="flex flex-1 flex-col gap-6 lg:gap-5 overflow-y-auto p-4 lg:p-6">
        {isAuthenticated && <MonthlyTrendChart points={trendPoints} loading={loadingTrend} />}
        {isAuthenticated && loading ? (
          <LoadingRealData />
        ) : report === null ? (
          <EmptyState
            headline="No hay movimientos en ese mes"
            body="Prueba con otro mes, o comprueba que tu banco esté sincronizado en Cuentas y patrimonio."
            action={{ label: 'Ver el mes anterior', onClick: () => setMonthsAgo((m) => m + 1) }}
          />
        ) : (
          <ReportBody
            report={report}
            categoryLabelById={categoryLabelById}
            onViewMovements={handleViewMovements}
            categoryTrend={isAuthenticated ? categoryTrend : null}
            loadingCategoryTrend={isAuthenticated && loadingCategoryTrend}
          />
        )}
      </main>
    </>
  )
}
