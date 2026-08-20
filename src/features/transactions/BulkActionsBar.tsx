import { useTransactionsStore } from './store'

/** Banda negra de acciones en lote. Solo visible cuando hay selección. */
export function BulkActionsBar() {
  const count = useTransactionsStore((s) => s.selectedIds.size)
  const clearSelection = useTransactionsStore((s) => s.clearSelection)

  if (count === 0) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-[14px] bg-ink px-5 py-3.5">
      <div className="text-base font-semibold text-surface">{count} movimientos seleccionados</div>
      <div className="flex flex-wrap gap-2.5">
        <button
          type="button"
          className="min-h-11 rounded-md border-none bg-surface px-3.5 py-2 text-[15px] font-semibold text-ink"
        >
          Cambiar categoría
        </button>
        <button
          type="button"
          className="min-h-11 rounded-md border border-ink-muted bg-transparent px-3.5 py-2 text-[15px] font-semibold text-surface"
        >
          Añadir etiqueta
        </button>
        <button
          type="button"
          onClick={clearSelection}
          className="min-h-11 rounded-md border border-ink-muted bg-transparent px-3.5 py-2 text-[15px] font-semibold text-surface"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
