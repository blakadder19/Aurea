import * as Dialog from '@radix-ui/react-dialog'
import { useRef, useState } from 'react'
import { Money } from '../../components/Money'
import { SectionLabel } from '../../components/SectionLabel'
import { SidePanel } from '../../components/SidePanel'
import { filterCategories, transactions, type Transaction } from '../../data/transactions'
import { useTransactionsStore } from './store'

interface PanelContentProps {
  transaction: Transaction
  onSave: (category: string) => void
}

function PanelContent({ transaction, onSave }: PanelContentProps) {
  const [category, setCategory] = useState(transaction.categoria)

  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <SectionLabel>Editar movimiento</SectionLabel>
          <Dialog.Title className="mt-1 font-serif text-[26px] font-semibold text-ink">
            {transaction.comercio}
          </Dialog.Title>
        </div>
        <Dialog.Close asChild>
          <button
            type="button"
            aria-label="Cerrar panel"
            className="flex h-11 w-11 items-center justify-center rounded-md border border-line bg-surface text-lg text-ink"
          >
            ✕
          </button>
        </Dialog.Close>
      </div>

      <Dialog.Description className="sr-only">
        Edita la categoría, las etiquetas y las notas de este movimiento.
      </Dialog.Description>

      <Money value={transaction.importe} serif className="text-[34px] font-semibold" />
      <div className="text-[15px] text-ink-muted">
        {transaction.fecha} 2026 · {transaction.cuenta}
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink-muted">
        Categoría
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="min-h-11 rounded-md border border-line bg-surface px-3 py-[11px] text-base text-ink"
        >
          {filterCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink-muted">
        Etiquetas
        <input
          placeholder="p. ej. compra semanal"
          className="min-h-11 rounded-md border border-line px-3 py-[11px] text-base text-ink"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink-muted">
        Notas
        <textarea rows={3} className="resize-y rounded-md border border-line px-3 py-[11px] text-base text-ink" />
      </label>

      <button
        type="button"
        className="min-h-11 self-start rounded-md border border-green px-4 py-2.5 text-base font-semibold text-green"
      >
        Dividir en varias categorías
      </button>
      <button
        type="button"
        className="min-h-11 self-start rounded-md border border-line px-4 py-2.5 text-base font-semibold text-ink"
      >
        Adjuntar recibo
      </button>
      <button
        type="button"
        onClick={() => onSave(category)}
        className="mt-2 min-h-11 rounded-md border border-green bg-green px-4 py-3 text-base font-bold text-surface hover:bg-green-hover"
      >
        Guardar cambios
      </button>
    </>
  )
}

/** Panel lateral de edición: se abre al hacer click en una fila de la tabla. */
export function TransactionPanel() {
  const transactionId = useTransactionsStore((s) => s.panelTransactionId)
  const closePanel = useTransactionsStore((s) => s.closePanel)
  const showUndo = useTransactionsStore((s) => s.showUndo)

  const transaction = transactions.find((t) => t.id === transactionId) ?? null

  // Recuerda qué fila abrió el panel para devolverle el foco al cerrar,
  // incluso después de que el store limpie panelTransactionId.
  const lastOpenedId = useRef<string | null>(null)
  if (transactionId) lastOpenedId.current = transactionId

  return (
    <SidePanel
      open={transaction !== null}
      onOpenChange={(open) => !open && closePanel()}
      onCloseAutoFocus={(event) => {
        event.preventDefault()
        const id = lastOpenedId.current
        // Radix aún puede tener el fondo marcado inert/aria-hidden en este
        // instante; se aplaza al siguiente tick para que el foco no se pierda.
        setTimeout(() => {
          document.querySelector<HTMLElement>(`[data-row-id="${id}"]`)?.focus()
        }, 0)
      }}
    >
      {transaction && (
        <PanelContent
          key={transaction.id}
          transaction={transaction}
          onSave={(category) => {
            showUndo(`Categoría de «${transaction.comercio}» cambiada a ${category}.`)
            closePanel()
          }}
        />
      )}
    </SidePanel>
  )
}
