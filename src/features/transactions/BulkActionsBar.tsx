import { useState } from 'react'
import type { Transaction, TransactionTag } from '../../data/transactions'
import { sharedTagsOf } from '../../lib/sharedTags'
import { tagBgClass } from '../../lib/tagColor'
import { TagPicker } from './TagPicker'
import { categoryLabel, type RealCategory } from './useRealCategories'
import { useTransactionsStore } from './store'

interface BulkActionsBarProps {
  categories?: RealCategory[]
  onBulkCategorize?: (ids: string[], categoryId: string) => Promise<string | null>
  onBulkAddTag?: (ids: string[], tagId: string) => Promise<{ error: string | null; taggedCount: number }>
  onBulkRemoveTag?: (ids: string[], tagId: string) => Promise<{ error: string | null; removedCount: number }>
  onCreateTag?: (name: string, emoji: string | null, color: string) => Promise<{ error: string | null; tag: TransactionTag | null }>
  /** El catálogo del usuario: se elige de aquí, nunca se teclea a mano. */
  availableTags?: TransactionTag[]
  /** Los movimientos cargados, para saber qué etiquetas comparten los seleccionados. */
  transactions?: Transaction[]
}

const DARK_BUTTON = 'min-h-11 rounded-md border border-ink-muted bg-transparent px-3.5 py-2 text-[15px] font-semibold text-surface'

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
export function BulkActionsBar({
  categories,
  onBulkCategorize,
  onBulkAddTag,
  onBulkRemoveTag,
  onCreateTag,
  availableTags = [],
  transactions = [],
}: BulkActionsBarProps) {
  const count = useTransactionsStore((s) => s.selectedIds.size)
  const selectedIds = useTransactionsStore((s) => s.selectedIds)
  const clearSelection = useTransactionsStore((s) => s.clearSelection)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const [removeChoice, setRemoveChoice] = useState('')

  // Solo las que llevan TODOS: quitar una que solo tiene la mitad de la
  // selección haría dos cosas distintas a la vez sin decirlo.
  const shared = sharedTagsOf(transactions, selectedIds)

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

  async function handlePick(tag: TransactionTag) {
    if (!onBulkAddTag) return
    setSaving(true)
    setError(null)
    // La selección se congela aquí: es la lista que de verdad se manda.
    const { error: err } = await onBulkAddTag(Array.from(selectedIds), tag.id)
    setSaving(false)
    if (err) setError(err)
    else {
      setPicking(false)
      clearSelection()
    }
  }

  async function handleRemove(tagId: string) {
    if (!onBulkRemoveTag || !tagId) return
    setSaving(true)
    setError(null)
    const { error: err } = await onBulkRemoveTag(Array.from(selectedIds), tagId)
    setSaving(false)
    if (err) setError(err)
    else {
      setRemoveChoice('')
      clearSelection()
    }
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
            <button type="button" className="min-h-11 rounded-md border-none bg-surface px-3.5 py-2 text-[15px] font-semibold text-ink">
              Cambiar categoría
            </button>
          )}

          <button type="button" disabled={!onBulkAddTag || saving} onClick={() => setPicking((p) => !p)} className={`${DARK_BUTTON} disabled:opacity-50`}>
            Añadir etiqueta
          </button>

          {/*
            Quitar solo aparece si hay algo que quitar a todos. Con una, botón
            directo con su nombre; con varias, hay que elegir cuál, porque
            adivinar por el usuario es justo lo que no debe hacer un lote.
          */}
          {onBulkRemoveTag && shared.length === 1 && (
            <button type="button" disabled={saving} onClick={() => void handleRemove(shared[0].id)} className={`${DARK_BUTTON} disabled:opacity-50`}>
              Quitar {shared[0].emoji ? `${shared[0].emoji} ` : ''}
              {shared[0].name}
            </button>
          )}
          {onBulkRemoveTag && shared.length > 1 && (
            <select
              aria-label="Quitar una etiqueta de los movimientos seleccionados"
              disabled={saving}
              value={removeChoice}
              onChange={(e) => void handleRemove(e.target.value)}
              className="min-h-11 rounded-md border-none bg-surface px-3.5 py-2 text-[15px] font-semibold text-ink"
            >
              <option value="" disabled>
                Quitar etiqueta…
              </option>
              {shared.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.emoji ? `${tag.emoji} ` : ''}
                  {tag.name}
                </option>
              ))}
            </select>
          )}

          <button type="button" onClick={clearSelection} className={DARK_BUTTON}>
            Cancelar
          </button>
        </div>
      </div>

      {picking && onCreateTag && (
        <div className="self-end">
          <TagPicker availableTags={availableTags} onPick={(tag) => void handlePick(tag)} onCreate={onCreateTag} disabled={saving} />
        </div>
      )}

      {/* Las que ya comparten todos, para saber qué se puede quitar sin abrir nada. */}
      {shared.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
          <span>Todos llevan:</span>
          {shared.map((tag) => (
            <span key={tag.id} className={`rounded-full px-2 py-0.5 text-[12px] font-medium text-surface ${tagBgClass(tag.color)}`}>
              {tag.emoji ? `${tag.emoji} ` : ''}
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-danger-text">{error}</p>}
    </div>
  )
}
