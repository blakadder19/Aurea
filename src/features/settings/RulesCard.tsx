import { useState } from 'react'
import { Card } from '../../components/Card'
import { categoryLabel, type RealCategory } from '../transactions/useRealCategories'
import { deleteRule, type RealRule } from '../transactions/useRealRules'

function RuleRow({ rule, categoryName, onDeleted }: { rule: RealRule; categoryName: string; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    const err = await deleteRule(rule.id)
    setDeleting(false)
    if (err) setError(err)
    else onDeleted()
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#f0f3f1] py-3 last:border-b-0">
      <div className="text-base text-ink">
        Si el movimiento contiene «{rule.matchValue}» → <span className="font-semibold">{categoryName}</span>
      </div>
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          disabled={deleting}
          onClick={() => void handleDelete()}
          className="text-sm font-semibold text-danger-text underline hover:no-underline disabled:opacity-60"
        >
          Borrar
        </button>
        {error && <p className="max-w-[220px] text-right text-sm text-danger-text">{error}</p>}
      </div>
    </div>
  )
}

/** Reglas de clasificación creadas desde "Aplicar esta categoría a movimientos parecidos" — se siguen aplicando solas a cada sincronización, así que conviene poder verlas y borrar las que ya no encajen. */
export function RulesCard({ rules, categories, onRefetch }: { rules: RealRule[]; categories: RealCategory[]; onRefetch: () => void }) {
  if (rules.length === 0) return null

  const categoryById = new Map(categories.map((c) => [c.id, categoryLabel(c)]))

  return (
    <Card padding="lg" className="flex flex-col gap-3">
      <div>
        <h2 className="font-serif text-[22px] lg:text-[19px] font-semibold text-ink">Reglas de clasificación</h2>
        <p className="text-[15px] text-ink-muted">
          Se crean desde "Aplicar esta categoría a movimientos parecidos" en un movimiento, y se siguen aplicando solas a los
          que lleguen después. Borra las que ya no encajen.
        </p>
      </div>
      <div className="flex flex-col">
        {rules.map((r) => (
          <RuleRow key={r.id} rule={r} categoryName={categoryById.get(r.categoryId) ?? 'Categoría borrada'} onDeleted={onRefetch} />
        ))}
      </div>
    </Card>
  )
}
