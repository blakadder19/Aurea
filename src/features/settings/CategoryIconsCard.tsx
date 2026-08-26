import { useState } from 'react'
import { Card } from '../../components/Card'
import {
  CATEGORY_GROUP_ORDER,
  categoryGroupLabel,
  createCategory,
  deleteCategory,
  updateCategoryIcon,
  type RealCategory,
} from '../transactions/useRealCategories'

function IconInput({ category, onSaved, onDeleted }: { category: RealCategory; onSaved: () => void; onDeleted: () => void }) {
  const [value, setValue] = useState(category.icon ?? '')
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleBlur() {
    if (value === (category.icon ?? '')) return
    const err = await updateCategoryIcon(category.id, value)
    if (err) setError(err)
    else {
      setError(null)
      onSaved()
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    const err = await deleteCategory(category.id)
    setDeleting(false)
    if (err) setError(err)
    else onDeleted()
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#f0f3f1] py-3 last:border-b-0">
      <span className="text-base text-ink">{category.name}</span>
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2.5">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => void handleBlur()}
            placeholder="🙂"
            maxLength={4}
            aria-label={`Icono de ${category.name}`}
            className="min-h-11 w-16 rounded-md border border-line bg-surface text-center text-xl"
          />
          <button
            type="button"
            disabled={deleting}
            onClick={() => void handleDelete()}
            className="text-sm font-semibold text-danger-text underline hover:no-underline disabled:opacity-60"
          >
            Borrar
          </button>
        </div>
        {error && <p className="max-w-[220px] text-right text-sm text-danger-text">{error}</p>}
      </div>
    </div>
  )
}

function AddCategoryForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setSaving(true)
    setError(null)
    const err = await createCategory(name, icon)
    setSaving(false)
    if (err) setError(err)
    else {
      setName('')
      setIcon('')
      onCreated()
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-line pt-3">
      <div className="flex items-center gap-2.5">
        <input
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="🙂"
          maxLength={4}
          disabled={saving}
          aria-label="Icono de la nueva categoría"
          className="min-h-11 w-16 rounded-md border border-line bg-surface text-center text-xl"
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nueva categoría"
          disabled={saving}
          aria-label="Nombre de la nueva categoría"
          className="min-h-11 flex-1 rounded-md border border-line px-3.5 py-2.5 text-base text-ink"
        />
        <button
          type="button"
          disabled={saving || !name.trim()}
          onClick={() => void handleSubmit()}
          className="min-h-11 rounded-md border border-brand bg-brand px-4 py-2.5 text-base font-semibold text-surface hover:bg-brand-hover disabled:opacity-60"
        >
          Añadir
        </button>
      </div>
      {error && <p className="text-sm text-danger-text">{error}</p>}
    </div>
  )
}

function groupByCategory(categories: RealCategory[]): { group: string; label: string; categories: RealCategory[] }[] {
  const byGroup = new Map<string, RealCategory[]>()
  for (const c of categories) {
    byGroup.set(c.categoryGroup, [...(byGroup.get(c.categoryGroup) ?? []), c])
  }
  return CATEGORY_GROUP_ORDER.filter((g) => byGroup.has(g)).map((g) => ({
    group: g,
    label: categoryGroupLabel(g),
    categories: byGroup.get(g)!,
  }))
}

/** Icono/emoji por categoría, alta y baja — se usa en selectores y etiquetas de categoría por toda la app. Agrupadas por tipo. */
export function CategoryIconsCard({ categories, onRefetch }: { categories: RealCategory[]; onRefetch: () => void }) {
  const groups = groupByCategory(categories)

  return (
    <Card padding="lg" className="flex flex-col gap-3">
      <div>
        <h2 className="font-serif text-[22px] lg:text-[19px] font-semibold text-ink">Categorías</h2>
        <p className="text-[15px] text-ink-muted">Ponle un emoji a cada categoría, añade una nueva o borra las que no uses.</p>
      </div>
      {groups.length > 0 && (
        <div className="flex flex-col gap-4">
          {groups.map(({ group, label, categories: groupCategories }) => (
            <div key={group}>
              <h3 className="mb-1 text-[13px] font-semibold tracking-[0.06em] text-ink-muted uppercase">{label}</h3>
              <div className="flex flex-col">
                {groupCategories.map((c) => (
                  <IconInput key={c.id} category={c} onSaved={onRefetch} onDeleted={onRefetch} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <AddCategoryForm onCreated={onRefetch} />
    </Card>
  )
}
