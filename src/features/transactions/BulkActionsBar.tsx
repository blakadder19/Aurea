import { useState } from 'react'
import { categoryLabel, type RealCategory } from './useRealCategories'
import { useTransactionsStore } from './store'

interface BulkActionsBarProps {
  categories?: RealCategory[]
  onBulkCategorize?: (ids: string[], categoryId: string) => Promise<string | null>
  onBulkAddTag?: (ids: string[], tag: string) => Promise<{ error: string | null; taggedCount: number }>
}

/**
 * Banda negra de acciones en lote. Solo visible cuando hay selección.
 *
 * Va pegada arriba (`sticky`) y no es un detalle estético. Vive dentro del
 * `<main>` con scroll de Movimientos, por encima de la tabla: sin pegarla,
 * seleccionar una casilla de la fila 200 renderiza la banda a miles de píxeles
 * por encima de lo que estás mirando y parece que no pasa nada. Con 300
 * movimientos cargados de entrada eso es lo normal, no el caso raro.
 *
 * `z-10` para quedar por encima de las filas; el panel de detalle es un
 * Dialog con z-50 y sigue tapándola, como debe.
 */
export function BulkActionsBar({ categories, onBulkCategorize, onBulkAddTag }: BulkActionsBarProps) {
  const count = useTransactionsStore((s) => s.selectedIds.size)
  const selectedIds = useTransactionsStore((s) => s.selectedIds)
  const clearSelection = useTransactionsStore((s) => s.clearSelection)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addingTag, setAddingTag] = useState(false)
  const [tagInput, setTagInput] = useState('')

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

  async function handleBulkAddTag() {
    if (!onBulkAddTag) return
    setSaving(true)
    setError(null)
    // La selección se congela aquí: es la lista que de verdad se manda, y la
    // que hay que comparar con lo que responda.
    const ids = Array.from(selectedIds)
    const { error: err } = await onBulkAddTag(ids, tagInput)
    if (err) setError(err)
    else {
      setAddingTag(false)
      setTagInput('')
      clearSelection()
    }
    setSaving(false)
  }

  return (
    <div data-testid="bulk-actions-bar" className="sticky top-0 z-10 flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[14px] bg-ink px-5 py-3.5 shadow-[0_6px_18px_rgba(22,26,25,0.18)]">
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
                  {categoryLabel(c)}
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
          {addingTag ? (
            <>
              <input
                autoFocus
                type="text"
                value={tagInput}
                disabled={saving}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleBulkAddTag()
                  if (e.key === 'Escape') setAddingTag(false)
                }}
                placeholder="Nombre de la etiqueta"
                className="min-h-11 rounded-md border-none bg-surface px-3.5 py-2 text-[15px] text-ink"
              />
              <button
                type="button"
                disabled={saving || !tagInput.trim()}
                onClick={() => void handleBulkAddTag()}
                className="min-h-11 rounded-md border-none bg-surface px-3.5 py-2 text-[15px] font-semibold text-ink disabled:opacity-60"
              >
                Añadir
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={!onBulkAddTag}
              onClick={() => setAddingTag(true)}
              className="min-h-11 rounded-md border border-ink-muted bg-transparent px-3.5 py-2 text-[15px] font-semibold text-surface disabled:opacity-50"
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
