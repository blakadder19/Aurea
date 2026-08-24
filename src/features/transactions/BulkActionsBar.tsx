import { useState } from 'react'
import type { RealCategory } from './useRealCategories'
import { useTransactionsStore } from './store'

interface BulkActionsBarProps {
  categories?: RealCategory[]
  onBulkCategorize?: (ids: string[], categoryId: string) => Promise<string | null>
}

/** Banda negra de acciones en lote. Solo visible cuando hay selección. */
export function BulkActionsBar({ categories, onBulkCategorize }: BulkActionsBarProps) {
  const count = useTransactionsStore((s) => s.selectedIds.size)
  const selectedIds = useTransactionsStore((s) => s.selectedIds)
  const clearSelection = useTransactionsStore((s) => s.clearSelection)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (count === 0) return null

  async function handleBulkCategorize(categoryId: string) {
    if (!onBulkCategorize || !categoryId) return
    setSaving(true)
    setError(null)
    const err = await onBulkCategorize(Array.from(selectedIds), categoryId)
    if (err) setError(err)
    else clearSelection()
    setSaving(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[14px] bg-ink px-5 py-3.5">
        <div className="text-base font-semibold text-surface">
          {count} movimiento{count === 1 ? '' : 's'} seleccionado{count === 1 ? '' : 's'}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {categories && onBulkCategorize ? (
            <select
              aria-label="Cambiar categoría de los movimientos seleccionados"
              disabled={saving}
              defaultValue=""
              onChange={(e) => void handleBulkCategorize(e.target.value)}
              className="min-h-11 rounded-md border-none bg-surface px-3.5 py-2 text-[15px] font-semibold text-ink"
            >
              <option value="" disabled>
                Cambiar categoría a…
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <button
              type="button"
              className="min-h-11 rounded-md border-none bg-surface px-3.5 py-2 text-[15px] font-semibold text-ink"
            >
              Cambiar categoría
            </button>
          )}
          {!onBulkCategorize && (
            <button
              type="button"
              className="min-h-11 rounded-md border border-ink-muted bg-transparent px-3.5 py-2 text-[15px] font-semibold text-surface"
            >
              Añadir etiqueta
            </button>
          )}
          <button
            type="button"
            onClick={clearSelection}
            className="min-h-11 rounded-md border border-ink-muted bg-transparent px-3.5 py-2 text-[15px] font-semibold text-surface"
          >
            Cancelar
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-danger-text">{error}</p>}
    </div>
  )
}
