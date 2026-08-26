import * as Dialog from '@radix-ui/react-dialog'
import { useEffect, useRef, useState } from 'react'
import { Money } from '../../components/Money'
import { SectionLabel } from '../../components/SectionLabel'
import { SidePanel } from '../../components/SidePanel'
import { filterCategories, transactions as demoTransactions, type Transaction } from '../../data/transactions'
import { focusRowById } from '../../lib/dom'
import { displayLabelFor } from './TransactionsTable'
import { useTransactionsStore } from './store'
import { categoryLabel, type RealCategory } from './useRealCategories'
import type { RealTransaction } from './useRealTransactions'
import { fetchReceiptSignedUrl, removeTransactionReceipt, uploadTransactionReceipt } from './useTransactionReceipt'
import { fetchTransactionSplits, saveTransactionSplits, type TransactionSplit } from './useTransactionSplits'

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

interface SplitRow {
  categoryId: string
  amountEuros: string
}

interface SplitEditorProps {
  transaction: RealTransaction
  categories: RealCategory[]
  initialSplits: TransactionSplit[]
  onSaved: (splits: TransactionSplit[]) => void
  onCancel: () => void
}

/** Editor de "Dividir en varias categorías": filas de categoría + importe que deben sumar el total del movimiento. */
function SplitEditor({ transaction, categories, initialSplits, onSaved, onCancel }: SplitEditorProps) {
  const sign = transaction.importe < 0 ? -1 : 1
  const totalAbs = Math.abs(transaction.importe)
  const [rows, setRows] = useState<SplitRow[]>(() =>
    initialSplits.length > 0
      ? initialSplits.map((s) => ({ categoryId: s.categoryId, amountEuros: (Math.abs(s.amountCents) / 100).toString() }))
      : [
          { categoryId: categories[0]?.id ?? '', amountEuros: '' },
          { categoryId: categories[0]?.id ?? '', amountEuros: '' },
        ],
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sumEuros = rows.reduce((s, r) => s + (Number(r.amountEuros) || 0), 0)
  const remaining = Math.round((totalAbs - sumEuros) * 100) / 100

  function updateRow(index: number, patch: Partial<SplitRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  function addRow() {
    setRows((prev) => [...prev, { categoryId: categories[0]?.id ?? '', amountEuros: '' }])
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const splits: TransactionSplit[] = rows
      .filter((r) => r.categoryId && Number(r.amountEuros) > 0)
      .map((r) => ({ categoryId: r.categoryId, amountCents: Math.round(Number(r.amountEuros) * 100) * sign }))
    const err = await saveTransactionSplits(transaction.id, splits)
    setSaving(false)
    if (err) setError(err)
    else onSaved(splits)
  }

  async function handleRemoveSplit() {
    setSaving(true)
    setError(null)
    const err = await saveTransactionSplits(transaction.id, [])
    setSaving(false)
    if (err) setError(err)
    else onSaved([])
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-[14px] border border-line p-4">
      <SectionLabel>Dividir en varias categorías</SectionLabel>
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <select
            value={row.categoryId}
            disabled={saving}
            onChange={(e) => updateRow(i, { categoryId: e.target.value })}
            className={`flex-1 ${INPUT_CLASSES}`}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {categoryLabel(c)}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            step={0.01}
            value={row.amountEuros}
            disabled={saving}
            onChange={(e) => updateRow(i, { amountEuros: e.target.value })}
            placeholder="0,00"
            className={`w-24 ${INPUT_CLASSES}`}
          />
          <button
            type="button"
            disabled={saving || rows.length <= 2}
            onClick={() => removeRow(i)}
            aria-label="Quitar categoría"
            className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:text-danger-text disabled:opacity-30"
          >
            ✕
          </button>
        </div>
      ))}
      <button type="button" disabled={saving} onClick={addRow} className="self-start text-sm font-semibold text-brand underline hover:no-underline">
        + Añadir categoría
      </button>
      <div className={`text-sm ${remaining === 0 ? 'text-green-text' : 'text-ink-muted'}`}>
        {remaining === 0
          ? `Suma ${totalAbs.toLocaleString('es-ES', { minimumFractionDigits: 2 })} € — cuadra con el movimiento.`
          : `Faltan ${remaining.toLocaleString('es-ES', { minimumFractionDigits: 2 })} € para llegar a ${totalAbs.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €.`}
      </div>
      {error && <p className="text-sm text-danger-text">{error}</p>}
      <div className="flex gap-2.5">
        <button
          type="button"
          disabled={saving || remaining !== 0}
          onClick={() => void handleSave()}
          className="min-h-11 rounded-md border border-brand bg-brand px-4 py-2.5 text-base font-semibold text-surface hover:bg-brand-hover disabled:opacity-60"
        >
          Guardar división
        </button>
        <button type="button" disabled={saving} onClick={onCancel} className="min-h-11 rounded-md border border-line px-4 py-2.5 text-base font-semibold text-ink">
          Cancelar
        </button>
        {initialSplits.length > 0 && (
          <button type="button" disabled={saving} onClick={() => void handleRemoveSplit()} className="min-h-11 rounded-md px-4 py-2.5 text-base font-semibold text-danger-text">
            Quitar división
          </button>
        )}
      </div>
    </div>
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
  onSaveInternalTransfer?: (id: string, isInternalTransfer: boolean) => Promise<string | null>
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
function RealFields({ transaction, categories, onSaveCategory, onSaveNotesAndTags, onCreateRule, onClose, manualAccountIds, onUpdateManual, onDeleteManual, onSaveDisplayName, onSaveInternalTransfer }: RealFieldsProps) {
  const [categoryId, setCategoryId] = useState(transaction.categoryId ?? '')
  const [tagsInput, setTagsInput] = useState(transaction.tags.join(', '))
  const [noteInput, setNoteInput] = useState(transaction.userNote)
  const [displayNameInput, setDisplayNameInput] = useState(transaction.displayName ?? '')
  const [isTransfer, setIsTransfer] = useState(transaction.isInternalTransfer)
  const isManual = manualAccountIds?.has(transaction.accountId) ?? false
  const [manualDescription, setManualDescription] = useState(transaction.comercio)
  const [manualAmount, setManualAmount] = useState(String(transaction.importe))
  const [manualDateIso, setManualDateIso] = useState(transaction.dateISO ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ruleMessage, setRuleMessage] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [splits, setSplits] = useState<TransactionSplit[]>([])
  const [editingSplit, setEditingSplit] = useState(false)
  const [receiptPath, setReceiptPath] = useState(transaction.receiptPath)
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null)
  const [uploadingReceipt, setUploadingReceipt] = useState(false)
  const [receiptError, setReceiptError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchTransactionSplits(transaction.id).then((s) => {
      if (!cancelled) setSplits(s)
    })
    return () => {
      cancelled = true
    }
  }, [transaction.id])

  useEffect(() => {
    if (!receiptPath) {
      setReceiptPreviewUrl(null)
      return
    }
    let cancelled = false
    fetchReceiptSignedUrl(receiptPath).then((url) => {
      if (!cancelled) setReceiptPreviewUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [receiptPath])

  async function handleUploadReceipt(file: File) {
    setUploadingReceipt(true)
    setReceiptError(null)
    const { path, error: err } = await uploadTransactionReceipt(transaction.id, file)
    setUploadingReceipt(false)
    if (err) setReceiptError(err)
    else setReceiptPath(path)
  }

  async function handleRemoveReceipt() {
    if (!receiptPath) return
    setUploadingReceipt(true)
    setReceiptError(null)
    const err = await removeTransactionReceipt(transaction.id, receiptPath)
    setUploadingReceipt(false)
    if (err) setReceiptError(err)
    else setReceiptPath(null)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    const errors = await Promise.all([
      splits.length === 0 && categoryId !== (transaction.categoryId ?? '') ? onSaveCategory(transaction.id, categoryId) : null,
      onSaveNotesAndTags(transaction.id, noteInput, tags),
      isManual && onUpdateManual
        ? onUpdateManual(transaction.id, transaction.accountId, manualDescription, Math.round(Number(manualAmount || '0') * 100), manualDateIso)
        : null,
      !isManual && onSaveDisplayName && displayNameInput !== (transaction.displayName ?? '')
        ? onSaveDisplayName(transaction.id, displayNameInput)
        : null,
      onSaveInternalTransfer && isTransfer !== transaction.isInternalTransfer
        ? onSaveInternalTransfer(transaction.id, isTransfer)
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
    else
      setRuleMessage(
        `Hecho. ${appliedCount} movimiento${appliedCount === 1 ? '' : 's'} parecido${appliedCount === 1 ? '' : 's'} a «${transaction.comercio}» clasificado${appliedCount === 1 ? '' : 's'} igual. Los que lleguen de aquí en adelante se clasificarán solos en la próxima sincronización.`,
      )
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
      {onSaveInternalTransfer && (
        <label className="flex items-center gap-2.5 text-[15px] font-semibold text-ink">
          <input
            type="checkbox"
            checked={isTransfer}
            disabled={saving}
            onChange={(e) => setIsTransfer(e.target.checked)}
            className="h-5 w-5"
          />
          Es una transferencia entre mis propias cuentas
        </label>
      )}
      {isTransfer && <p className="text-sm text-ink-muted">No contará como gasto ni ingreso, ni en detección de anomalías.</p>}
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
          disabled={saving || splits.length > 0}
          onChange={(e) => setCategoryId(e.target.value)}
          className={INPUT_CLASSES}
        >
          {!categoryId && <option value="">Sin clasificar</option>}
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {categoryLabel(c)}
            </option>
          ))}
        </select>
        {splits.length > 0 && <span className="text-sm text-ink-muted">Dividido en {splits.length} categorías — quita la división para elegir una sola.</span>}
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
      {editingSplit ? (
        <SplitEditor
          transaction={transaction}
          categories={categories}
          initialSplits={splits}
          onSaved={(newSplits) => {
            setSplits(newSplits)
            setEditingSplit(false)
          }}
          onCancel={() => setEditingSplit(false)}
        />
      ) : splits.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-[14px] border border-line p-4">
          <SectionLabel>Dividido en {splits.length} categorías</SectionLabel>
          {splits.map((s, i) => {
            const cat = categories.find((c) => c.id === s.categoryId)
            return (
              <div key={i} className="flex justify-between text-[15px] text-ink">
                <span>{cat ? categoryLabel(cat) : 'Sin clasificar'}</span>
                <Money value={Math.abs(s.amountCents) / 100} className="font-semibold" />
              </div>
            )
          })}
          <button type="button" onClick={() => setEditingSplit(true)} className="self-start text-sm font-semibold text-brand underline hover:no-underline">
            Editar división
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setEditingSplit(true)} className={SECONDARY_BUTTON}>
          Dividir en varias categorías
        </button>
      )}
      {receiptPath ? (
        <div className="flex items-center gap-3">
          {receiptPreviewUrl && (
            <a href={receiptPreviewUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand underline hover:no-underline">
              Ver recibo
            </a>
          )}
          <button type="button" disabled={uploadingReceipt} onClick={() => void handleRemoveReceipt()} className="text-sm font-semibold text-danger-text underline hover:no-underline">
            Quitar recibo
          </button>
        </div>
      ) : (
        <label className={`${SECONDARY_BUTTON} inline-flex cursor-pointer items-center ${uploadingReceipt ? 'opacity-60' : ''}`}>
          {uploadingReceipt ? 'Subiendo…' : 'Adjuntar recibo'}
          <input
            type="file"
            accept="image/*"
            disabled={uploadingReceipt}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleUploadReceipt(file)
              e.target.value = ''
            }}
          />
        </label>
      )}
      {receiptError && <p className="text-sm text-danger-text">{receiptError}</p>}
      {categoryId && (
        <button type="button" disabled={saving} onClick={() => void handleCreateRule()} className={SECONDARY_BUTTON}>
          Aplicar esta categoría a movimientos parecidos
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
