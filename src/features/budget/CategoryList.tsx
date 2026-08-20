import { Card } from '../../components/Card'
import { budgetCategories } from '../../data/budget'
import { CategoryRow } from './CategoryRow'

/** Bloque 2 — Gasto de consumo por categoría. */
export function CategoryList() {
  return (
    <Card className="flex flex-col gap-[18px]" padding="lg">
      <h2 className="font-serif text-[22px] font-semibold text-ink">Gasto de consumo por categoría</h2>
      <div className="flex flex-col gap-3.5">
        {budgetCategories.map((c) => (
          <CategoryRow key={c.id} category={c} />
        ))}
      </div>
    </Card>
  )
}
