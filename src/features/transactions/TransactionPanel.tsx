import * as Dialog from '@radix-ui/react-dialog'
import { useRef, useState } from 'react'
import { Money } from '../../components/Money'
import { SectionLabel } from '../../components/SectionLabel'
import { SidePanel } from '../../components/SidePanel'
import { filterCategories, transactions as demoTransactions, type Transaction } from '../../data/transactions'
import { focusRowById } from '../../lib/dom'
import { displayLabelFor } from './TransactionsTable'
import { useTransactionsStore } from './store'
import type { RealCategory } from './useRealCategories'
import type { RealTransaction } from './useRealTransactions'

const LABEL_CLASSES = 'flex flex-col gap-1.5 text-sm font-semibold text-ink-muted'
const INPUT_CLASSES = 'min-h-11 rounded-md border border-line px-3 py-[11px] text-base text-ink'
const SECONDARY_BUTTON = 'min-h-11 self-start rounded-md border border-line px-4 py-2.5 text-base font-semibold text-ink'

/** Categoría/Etiquetas/Notas de la demo: nada se persiste, "Guardar" solo enseña un toast de deshacer. */
function DemoFields({ transaction, onSave }: { transaction: Transaction; onSave: (category: string) => void }) {
  const [category, setCategory] = useState(transaction.categoria)

  return (
    <>
      <label className={LABEL_CLASSES}>
        Categoría
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={INPUT_CLASSES}>
          {filterCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className={LABEL_CLASSES}>
        Etiquetas
        <input placeholder="p. ej. compra semanal" className={INPUT_CLASSES} />
      </label>
      <label className={LABEL_CLASSES}>
        Notas
        <textarea rows={3} className={`resize-y ${INPUT_CLASSES}`} />
      </label>
      <button type="button" className={SECONDARY_BUTTON}>
        Dividir en varias categorías
      </button>
      <button type="button" className={SECONDARY_BUTTON}>
        Adjuntar recibo
      </button>
      <button
        type="button"
        onClick={() => onSave(category)}
        className="mt-2 min-h-11 rounded-md border border-brand bg-brand px-4 py-3 text-base font-bold text-surface hover:bg-brand-hover"
      >
        Guardar cambios
      </button>
    </>
  )
}

interface RealFieldsProps {
  transaction: RealTransaction
  categories: RealCategory[]
  onSaveCategory: (id: string, categoryId: string) => Promise<string | null>
  onSaveNotesAndTags: (id: string, note: string, tags: string[]) => Promise<string | null>
  onCreateRule: (matchValue: string, categoryId: string) => Promise<{ error: string | null; appliedCount: number }>
  onClose: () => void
  manualAccountIds?: Set<string>
  onUpdateManual?: (id: string, accountId: string, description: string, amountCents: number, dateIso: string) => Promise<string | null>
  onDeleteManual?: (id: string, accountId: string) => Promise<string | null>
  onSaveDisplayName?: (id: string, displayName: string) => Promise<string | null>
}

/** Solo tiene sentido para movimientos manuales: los sincronizados con el banco siempre reflejan lo que dice el banco. */
function ManualFields({
  transaction,
  description,
  setDescription,
  amount,
  setAmount,
  dateIso,
  setDateIso,
  disabled,
}: {
  transaction: RealTransaction
  description: string
  setDescription: (v: string) => void
  amount: string
  setAmount: (v: string) => void
  dateIso: string
  setDateIso: (v: string) => void
  disabled: boolean
}) {
  return (
    <>
      <label className={LABEL_CLASSES}>
        Comercio o descripción
        <input value={description} disabled={disabled} onChange={(e) => setDescription(e.target.value)} className={INPUT_CLASSES} />
      </label>
      <div className="flex gap-3">
        <label className={`${LABEL_CLASSES} flex-1`}>
          Importe ({transaction.importe < 0 ? 'gasto' : 'ingreso'})
          <input type="number" step={1} value={amount} disabled={disabled} onChange={(e) => setAmount(e.target.value)} className={INPUT_CLASSES} />
        </label>
        <label className={`${LABEL_CLASSES} flex-1`}>
          Fecha
          <input type="date" value={dateIso} disabled={disabled} onChange={(e) => setDateIso(e.target.value)} className={INPUT_CLASSES} />
        </label>
      </div>
    </>
  )
}

/** Categoría/Etiquetas/Notas reales: cada cambio persiste de verdad en Supabase, bajo RLS. */
function RealFields({ transaction, categories, onSaveCategory, onSaveNotesAndTags, onCreateRule, onClose, manualAccountIds, onUpdateManual, onDeleteManual, onSaveDisplayName }: RealFieldsProps) {
  const [categoryId, setCategoryId] = useState(transaction.categoryId ?? '')
  const [tagsInput, setTagsInput] = useState(transaction.tags.join(', '))
  const [noteInput, setNoteInput] = useState(transaction.userNote)
  const [displayNameInput, setDisplayNameInput] = useState(transaction.displayName ?? '')
  const isManual = manualAccountIds?.has(transaction.accountId) ?? false
  const [manualDescription, setManualDescription] = useState(transaction.comercio)
  const [manualAmount, setManualAmount] = useState(String(transaction.importe))
  const [manualDateIso, setManualDateIso] = useState(transaction.dateISO ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ruleMessage, setRuleMessage] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  async function handleSave() {
    setSaving(true)
    setError(null)
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    const errors = await Promise.all([
      categoryId !== (transaction.categoryId ?? '') ? onSaveCategory(transaction.id, categoryId) : null,
      onSaveNotesAndTags(transaction.id, noteInput, tags),
      isManual && onUpdateManual
        ? onUpdateManual(transaction.id, transaction.accountId, manualDescription, Math.round(Number(manualAmount || '0') * 100), manualDateIso)
        : null,
      !isManual && onSaveDisplayName && displayNameInput !== (transaction.displayName ?? '')
        ? onSaveDisplayName(transaction.id, displayNameInput)
        : null,
    ])
    setSaving(false)
    const firstError = errors.find((e): e is string => Boolean(e))
    if (firstError) setError(firstError)
    else onClose()
  }

  async function handleDelete() {
    if (!onDeleteManual) return
    setSaving(true)
    setError(null)
    const err = await onDeleteManual(transaction.id, transaction.accountId)
    setSaving(false)
    if (err) setError(err)
    else onClose()
  }

  async function handleCreateRule() {
    if (!categoryId) return
    setSaving(true)
    setError(null)
    const { error: err, appliedCount } = await onCreateRule(transaction.comercio, categoryId)
    setSaving(false)
    if (err) setError(err)
    else setRuleMessage(`Regla creada. ${appliedCount} movimiento${appliedCount === 1 ? '' : 's'} clasificado${appliedCount === 1 ? '' : 's'} con «${transaction.comercio}».`)
  }

  return (
    <>
      {isManual && (
        <ManualFields
          transaction={transaction}
          description={manualDescription}
          setDescription={setManualDescription}
          amount={manualAmount}
          setAmount={setManualAmount}
          dateIso={manualDateIso}
          setDateIso={setManualDateIso}
          disabled={saving}
        />
      )}
      {!isManual && onSaveDisplayName && (
        <label className={LABEL_CLASSES}>
          Nombre para ti
          <input
            value={displayNameInput}
            disabled={saving}
            onChange={(e) => setDisplayNameInput(e.target.value)}
            placeholder={transaction.comercio}
            className={INPUT_CLASSES}
          />
        </label>
      )}
      {isManual && onDeleteManual && (
        <div className="flex items-center gap-2.5">
          {confirmingDelete ? (
            <>
              <span className="text-sm text-danger-text">¿Borrar este movimiento?</span>
              <button type="button" disabled={saving} onClick={() => void handleDelete()} className="min-h-11 rounded-md border border-danger-line bg-danger-bg px-3.5 text-sm font-semibold text-danger-text">
                Sí, borrar
              </button>
              <button type="button" disabled={saving} onClick={() => setConfirmingDelete(false)} className="min-h-11 rounded-md border border-line px-3.5 text-sm font-semibold text-ink">
                Cancelar
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={() => setConfirmingDelete(true)}
              className="min-h-11 self-start rounded-md border border-danger-line px-4 py-2.5 text-base font-semibold text-danger-text hover:bg-danger-bg"
            >
              Borrar movimiento
            </button>
          )}
        </div>
      )}
      <label className={LABEL_CLASSES}>
        Categoría
        <select
          value={categoryId}
          disabled={saving}
          onChange={(e) => setCategoryId(e.target.value)}
          className={INPUT_CLASSES}
        >
          {!categoryId && <option value="">Sin clasificar</option>}
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className={LABEL_CLASSES}>
        Etiquetas
        <input
          value={tagsInput}
          disabled={saving}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="p. ej. compra semanal, separadas por comas"
          className={INPUT_CLASSES}
        />
      </label>
      <label className={LABEL_CLASSES}>
        Notas
        <textarea
          rows={3}
          value={noteInput}
          disabled={saving}
          onChange={(e) => setNoteInput(e.target.value)}
          className={`resize-y ${INPUT_CLASSES}`}
        />
      </label>
      {categoryId && (
        <button type="button" disabled={saving} onClick={() => void handleCreateRule()} className={SECONDARY_BUTTON}>
          Crear regla para «{transaction.comercio}»
        </button>
      )}
      {ruleMessage && <p className="text-sm text-green-text">{ruleMessage}</p>}
      {error && <p className="text-sm text-danger-text">{error}</p>}
      <button
        type="button"
        disabled={saving}
        onClick={() => void handleSave()}
        className="mt-2 min-h-11 rounded-md border border-brand bg-brand px-4 py-3 text-base font-bold text-surface hover:bg-brand-hover"
      >
        Guardar cambios
      </button>
    </>
  )
}

interface PanelContentProps {
  transaction: Transaction | RealTransaction
  real?: Omit<RealFieldsProps, 'transaction' | 'onClose'>
  onSave: (category: string) => void
  onClose: () => void
}

function PanelContent({ transaction, real, onSave, onClose }: PanelContentProps) {
  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <SectionLabel>Editar movimiento</SectionLabel>
          <Dialog.Title className="mt-1 font-serif text-[26px] font-semibold text-ink">
            {displayLabelFor(transaction)}
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

      {real ? (
        <RealFields transaction={transaction as RealTransaction} onClose={onClose} {...real} />
      ) : (
        <DemoFields transaction={transaction} onSave={onSave} />
      )}
    </>
  )
}

interface TransactionPanelProps {
  transactions?: Transaction[] | RealTransaction[]
  real?: Omit<RealFieldsProps, 'transaction' | 'onClose'>
}

/** Panel lateral de edición: se abre al hacer click en una fila de la tabla. */
export function TransactionPanel({ transactions = demoTransactions, real }: TransactionPanelProps) {
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
        setTimeout(() => focusRowById(id), 0)
      }}
    >
      {transaction && (
        <PanelContent
          key={transaction.id}
          transaction={transaction}
          real={real}
          onClose={closePanel}
          onSave={(category) => {
            showUndo(`Categoría de «${transaction.comercio}» cambiada a ${category}.`)
            closePanel()
          }}
        />
      )}
    </SidePanel>
  )
}
