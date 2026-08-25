import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { ProgressBar } from '../../components/ProgressBar'
import { budgetCategories } from '../../data/demo'

const VARIANT_FILL: Record<string, string> = {
  success: 'bg-green',
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-ink-muted',
}

const VARIANT_TEXT: Record<string, string> = {
  success: 'text-green-text',
  warning: 'text-warning-text',
  danger: 'text-danger-text',
  neutral: 'text-ink-muted',
}

export interface RealBudgetRow {
  name: string
  budgeted: number
  spent: number
  status: string
  variant: 'success' | 'warning' | 'danger' | 'neutral'
}

/** Solo en modo Detalle — "Dónde se va el presupuesto", categorías reales o demo. */
export function BudgetBreakdownTable({ real, monthLabel }: { real?: RealBudgetRow[]; monthLabel?: string } = {}) {
  const rows = real ?? budgetCategories

  return (
    <Card className="flex flex-col gap-4" padding="lg">
      <div>
        <h2 className="font-serif text-2xl font-semibold text-ink">Dónde se va el presupuesto{monthLabel ? ` de ${monthLabel}` : ' de agosto'}</h2>
        <div className="mt-1.5 text-base text-ink-muted">
          Solo gasto de consumo. Ahorro, inversión y transferencias van aparte.
        </div>
      </div>

      <table className="hidden w-full border-collapse tabular lg:table">
        <thead>
          <tr>
            <th className="border-b border-line pr-4 pb-2.5 text-left text-[13px] font-semibold tracking-[0.06em] text-ink-muted uppercase">
              Categoría
            </th>
            <th className="border-b border-line pr-4 pb-2.5 text-right text-[13px] font-semibold tracking-[0.06em] text-ink-muted uppercase">
              Presupuestado
            </th>
            <th className="border-b border-line pr-4 pb-2.5 text-right text-[13px] font-semibold tracking-[0.06em] text-ink-muted uppercase">
              Gastado
            </th>
            <th className="border-b border-line py-0 pb-2.5 pr-4 pl-6 text-left text-[13px] font-semibold tracking-[0.06em] text-ink-muted uppercase">
              Ritmo
            </th>
            <th className="border-b border-line pb-2.5 text-left text-[13px] font-semibold tracking-[0.06em] text-ink-muted uppercase">
              Estado
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const pct = c.budgeted > 0 ? Math.min(100, (c.spent / c.budgeted) * 100) : 0
            return (
              <tr key={c.name}>
                <td className="border-b border-[#f0f3f1] py-3 pr-4 text-base font-semibold text-ink">{c.name}</td>
                <td className="border-b border-[#f0f3f1] py-3 pr-4 text-right text-base text-ink-muted">
                  <Money value={c.budgeted} decimals={0} />
                </td>
                <td className="border-b border-[#f0f3f1] py-3 pr-4 text-right text-base font-semibold text-ink">
                  <Money value={c.spent} decimals={0} />
                </td>
                <td className="w-[30%] border-b border-[#f0f3f1] py-3 pr-4 pl-6">
                  <ProgressBar
                    percent={pct}
                    fillClassName={VARIANT_FILL[c.variant]}
                    heightPx={10}
                    label={`${c.name}: ${Math.round(pct)}% del presupuesto`}
                  />
                </td>
                <td className={`border-b border-[#f0f3f1] py-3 text-base font-semibold ${VARIANT_TEXT[c.variant]}`}>
                  {c.status}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="flex flex-col gap-2.5 lg:hidden">
        {rows.map((c) => {
          const pct = Math.min(100, (c.spent / c.budgeted) * 100)
          return (
            <div key={c.name} className="flex flex-col gap-2 rounded-2xl border border-line p-3.5">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-base font-semibold text-ink">{c.name}</div>
                <div className="text-sm text-ink-muted tabular">
                  <Money value={c.spent} decimals={0} /> / <Money value={c.budgeted} decimals={0} />
                </div>
              </div>
              <ProgressBar
                percent={pct}
                fillClassName={VARIANT_FILL[c.variant]}
                heightPx={10}
                label={`${c.name}: ${Math.round(pct)}% del presupuesto`}
              />
              <div className={`text-sm font-semibold ${VARIANT_TEXT[c.variant]}`}>{c.status}</div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
