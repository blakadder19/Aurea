import { Money } from '../../components/Money'
import { ProgressBar } from '../../components/ProgressBar'
import type { BudgetCategory } from '../../data/budget'
import { useBudgetStore } from './store'

const STATUS_STYLE = {
  'Al día': { chip: 'bg-green-soft text-green-text', fill: 'bg-green' },
  'Por encima': { chip: 'bg-warning-bg text-warning-text', fill: 'bg-warning' },
  Agotado: { chip: 'bg-danger-bg text-danger-text', fill: 'bg-danger' },
  'Sin presupuesto': { chip: 'bg-canvas text-ink-muted', fill: 'bg-ink-muted' },
} as const

/** Una fila de categoría: nombre, cifras, chip de estado, barra y (en Detalle) explicación. */
export function CategoryRow({ category }: { category: BudgetCategory }) {
  const isDetalle = useBudgetStore((s) => s.mode === 'detalle')
  const budgeted = useBudgetStore((s) => s.categoryBudgets[category.id] ?? category.budgeted)
  const pct = budgeted > 0 ? (category.spent / budgeted) * 100 : 0
  const style = STATUS_STYLE[category.status]

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-[17px] font-semibold text-ink">{category.name}</div>
        <div className="flex items-center gap-3 tabular">
          {/*
            Sin presupuesto, "846 € de 0 €" es ruido: el "de 0 €" no aporta
            nada y se repite en cada categoría. Se enseña solo lo gastado.
          */}
          <span className="text-base text-ink-muted whitespace-nowrap">
            <Money value={category.spent} decimals={0} tone="muted" />
            {budgeted > 0 && (
              <>
                {' de '}
                <Money value={budgeted} decimals={0} tone="muted" />
              </>
            )}
          </span>
          {/* El chip "Sin presupuesto" repetido en cada fila no informa: que no haya cifra ya lo dice. */}
          {category.status !== 'Sin presupuesto' && (
            <span className={`rounded-full px-2.5 py-1 text-sm font-semibold whitespace-nowrap ${style.chip}`}>
              {category.status}
            </span>
          )}
        </div>
      </div>

      <ProgressBar
        percent={pct}
        fillClassName={style.fill}
        heightPx={12}
        label={`${category.name}: ${Math.round(pct)}% del presupuesto, ${category.status}`}
      />

      {isDetalle && <div className="mt-2 text-[15px] text-ink-muted">{category.detail}</div>}
    </div>
  )
}
