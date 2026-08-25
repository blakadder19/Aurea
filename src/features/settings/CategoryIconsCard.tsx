import { useState } from 'react'
import { Card } from '../../components/Card'
import { updateCategoryIcon, type RealCategory } from '../transactions/useRealCategories'

function IconInput({ category, onSaved }: { category: RealCategory; onSaved: () => void }) {
  const [value, setValue] = useState(category.icon ?? '')
  const [error, setError] = useState<string | null>(null)

  async function handleBlur() {
    if (value === (category.icon ?? '')) return
    const err = await updateCategoryIcon(category.id, value)
    if (err) setError(err)
    else {
      setError(null)
      onSaved()
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#f0f3f1] py-3 last:border-b-0">
      <span className="text-base text-ink">{category.name}</span>
      <div className="flex flex-col items-end gap-1">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => void handleBlur()}
          placeholder="🙂"
          maxLength={4}
          aria-label={`Icono de ${category.name}`}
          className="min-h-11 w-16 rounded-md border border-line bg-surface text-center text-xl"
        />
        {error && <p className="text-sm text-danger-text">{error}</p>}
      </div>
    </div>
  )
}

/** Icono/emoji por categoría — puramente visual, se usa en selectores y etiquetas de categoría por toda la app. */
export function CategoryIconsCard({ categories, onRefetch }: { categories: RealCategory[]; onRefetch: () => void }) {
  if (categories.length === 0) return null

  return (
    <Card padding="lg" className="flex flex-col gap-3">
      <div>
        <h2 className="font-serif text-[22px] lg:text-[19px] font-semibold text-ink">Iconos de categoría</h2>
        <p className="text-[15px] text-ink-muted">Ponle un emoji a cada categoría — se usa en Movimientos y Presupuesto.</p>
      </div>
      <div className="flex flex-col">
        {categories.map((c) => (
          <IconInput key={c.id} category={c} onSaved={onRefetch} />
        ))}
      </div>
    </Card>
  )
}
