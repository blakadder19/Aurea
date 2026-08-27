import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { budgetCategories, type BudgetCategory } from '../../data/budget'
import { CATEGORY_GROUP_ORDER, categoryGroupLabel } from '../transactions/useRealCategories'
import { CategoryRow } from './CategoryRow'

interface CategoryGroupBlock {
  group: string
  label: string
  categories: BudgetCategory[]
}

/** Agrupa por `category.group` en el orden fijo de grupos — solo tiene sentido en real, la demo no trae `group`. */
function groupByCategory(categories: BudgetCategory[]): CategoryGroupBlock[] {
  const byGroup = new Map<string, BudgetCategory[]>()
  for (const c of categories) {
    const key = c.group!
    byGroup.set(key, [...(byGroup.get(key) ?? []), c])
  }
  return CATEGORY_GROUP_ORDER.filter((g) => byGroup.has(g)).map((g) => ({ group: g, label: categoryGroupLabel(g), categories: byGroup.get(g)! }))
}

/** Bloque 2 — Gasto de consumo por categoría, agrupado por tipo (Vivienda, Ocio...) cuando hay datos reales. */
export function CategoryList({ categories = budgetCategories }: { categories?: BudgetCategory[] }) {
  const groups = categories.every((c) => c.group) ? groupByCategory(categories) : null

  return (
    <Card className="flex flex-col gap-[18px]" padding="lg">
      <h2 className="font-serif text-[22px] lg:text-[19px] font-semibold text-ink">Gasto de consumo por categoría</h2>
      {groups ? (
        <div className="flex flex-col gap-5">
          {groups.map(({ group, label, categories: groupCategories }) => (
            <div key={group} className="flex flex-col gap-3.5">
              <div className="flex items-baseline justify-between gap-2 border-b border-line pb-1.5">
                <h3 className="text-[13px] font-semibold tracking-[0.06em] text-ink-muted uppercase">{label}</h3>
                <span className="text-sm whitespace-nowrap text-ink-muted">
                  <Money value={groupCategories.reduce((sum, c) => sum + c.spent, 0)} decimals={0} tone="muted" />
                  {groupCategories.some((c) => c.budgeted > 0) && (
                    <>
                      {' de '}
                      <Money value={groupCategories.reduce((sum, c) => sum + c.budgeted, 0)} decimals={0} tone="muted" />
                    </>
                  )}
                </span>
              </div>
              <div className="flex flex-col gap-3.5">
                {groupCategories.map((c) => (
                  <CategoryRow key={c.id} category={c} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {categories.map((c) => (
            <CategoryRow key={c.id} category={c} />
          ))}
        </div>
      )}
    </Card>
  )
}
