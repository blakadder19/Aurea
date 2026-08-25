import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'
import { SectionLabel } from '../../components/SectionLabel'
import { SidePanel } from '../../components/SidePanel'
import { EmptyState } from '../../components/states/EmptyState'
import type { Account, AccountFunction } from '../../data/accounts'
import type { RealCategory } from '../transactions/useRealCategories'

const LABEL_CLASSES = 'flex flex-col gap-1.5 text-sm font-semibold text-ink-muted'
const INPUT_CLASSES = 'min-h-11 rounded-md border border-line px-3 py-[11px] text-base text-ink'
const ASSIGNABLE_FUNCTIONS: AccountFunction[] = ['Para gastar', 'Ahorro', 'Inversión', 'Deuda', 'Activo manual']

function todayIsoLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function ClosePanelButton() {
  return (
    <Dialog.Close asChild>
      <button type="button" aria-label="Cerrar panel" className="flex h-11 w-11 items-center justify-center rounded-md border border-line bg-surface text-lg text-ink">
        ✕
      </button>
    </Dialog.Close>
  )
}

interface CreateAccountFormProps {
  onCreate: (name: string, fn: AccountFunction, startingBalanceCents: number) => Promise<string | null>
  onDone: () => void
}

function CreateManualAccountForm({ onCreate, onDone }: CreateAccountFormProps) {
  const [name, setName] = useState('')
  const [fn, setFn] = useState<AccountFunction>('Activo manual')
  const [startingBalance, setStartingBalance] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setSaving(true)
    setError(null)
    const err = await onCreate(name, fn, Math.round(Number(startingBalance || '0') * 100))
    setSaving(false)
    if (err) setError(err)
    else onDone()
  }

  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <SectionLabel>Cuenta manual</SectionLabel>
          <Dialog.Title className="mt-1 font-serif text-[26px] font-semibold text-ink">Crear cuenta manual</Dialog.Title>
        </div>
        <ClosePanelButton />
      </div>
      <p className="text-[15px] text-ink-muted">
        Para dinero que no está en ningún banco conectado — efectivo, una hucha, un préstamo entre amigos. El saldo se lleva
        sumando lo que registres aquí, nunca se sincroniza solo.
      </p>
      <label className={LABEL_CLASSES}>
        Nombre
        <input value={name} disabled={saving} onChange={(e) => setName(e.target.value)} placeholder="p. ej. Efectivo" className={INPUT_CLASSES} />
      </label>
      <label className={LABEL_CLASSES}>
        Función
        <select value={fn} disabled={saving} onChange={(e) => setFn(e.target.value as AccountFunction)} className={INPUT_CLASSES}>
          {ASSIGNABLE_FUNCTIONS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </label>
      <label className={LABEL_CLASSES}>
        Saldo inicial
        <input
          type="number"
          step={10}
          value={startingBalance}
          disabled={saving}
          onChange={(e) => setStartingBalance(e.target.value)}
          placeholder="0"
          className={INPUT_CLASSES}
        />
      </label>
      {error && <p className="text-sm text-danger-text">{error}</p>}
      <button
        type="button"
        disabled={saving}
        onClick={() => void handleSubmit()}
        className="mt-2 min-h-11 rounded-md border border-brand bg-brand px-4 py-3 text-base font-bold text-surface hover:bg-brand-hover"
      >
        Crear cuenta
      </button>
    </>
  )
}

interface AddMovementFormProps {
  manualAccounts: Account[]
  categories: RealCategory[]
  onAdd: (accountId: string, description: string, amountCents: number, dateIso: string, categoryId: string | null) => Promise<string | null>
  onDone: () => void
}

function AddManualMovementForm({ manualAccounts, categories, onAdd, onDone }: AddMovementFormProps) {
  const [accountId, setAccountId] = useState(manualAccounts[0]?.id ?? '')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [kind, setKind] = useState<'gasto' | 'ingreso'>('gasto')
  const [dateIso, setDateIso] = useState(todayIsoLocal())
  const [categoryId, setCategoryId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (manualAccounts.length === 0) {
    return (
      <>
        <div className="flex items-start justify-between">
          <div>
            <SectionLabel>Movimiento manual</SectionLabel>
            <Dialog.Title className="mt-1 font-serif text-[26px] font-semibold text-ink">Añadir movimiento</Dialog.Title>
          </div>
          <ClosePanelButton />
        </div>
        <EmptyState
          headline="Primero necesitas una cuenta manual"
          body="Un movimiento manual necesita una cuenta manual donde vivir — efectivo, una hucha, lo que sea. Créala desde Cuentas y patrimonio."
          action={{ label: 'Ir a Cuentas y patrimonio', to: '/cuentas' }}
        />
      </>
    )
  }

  async function handleSubmit() {
    setSaving(true)
    setError(null)
    const cents = Math.round(Number(amount || '0') * 100) * (kind === 'gasto' ? -1 : 1)
    const err = await onAdd(accountId, description, cents, dateIso, categoryId || null)
    setSaving(false)
    if (err) setError(err)
    else onDone()
  }

  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <SectionLabel>Movimiento manual</SectionLabel>
          <Dialog.Title className="mt-1 font-serif text-[26px] font-semibold text-ink">Añadir movimiento</Dialog.Title>
        </div>
        <ClosePanelButton />
      </div>
      <p className="text-[15px] text-ink-muted">Solo para cuentas manuales — las cuentas sincronizadas con tu banco siempre reflejan lo que dice el banco.</p>
      <label className={LABEL_CLASSES}>
        Cuenta
        <select value={accountId} disabled={saving} onChange={(e) => setAccountId(e.target.value)} className={INPUT_CLASSES}>
          {manualAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <label className={LABEL_CLASSES}>
        Descripción
        <input value={description} disabled={saving} onChange={(e) => setDescription(e.target.value)} placeholder="p. ej. Cena con amigos" className={INPUT_CLASSES} />
      </label>
      <div className="flex gap-3">
        <label className={`${LABEL_CLASSES} flex-1`}>
          Tipo
          <select value={kind} disabled={saving} onChange={(e) => setKind(e.target.value as 'gasto' | 'ingreso')} className={INPUT_CLASSES}>
            <option value="gasto">Gasto</option>
            <option value="ingreso">Ingreso</option>
          </select>
        </label>
        <label className={`${LABEL_CLASSES} flex-1`}>
          Importe
          <input type="number" min={0} step={1} value={amount} disabled={saving} onChange={(e) => setAmount(e.target.value)} className={INPUT_CLASSES} />
        </label>
      </div>
      <label className={LABEL_CLASSES}>
        Fecha
        <input type="date" value={dateIso} disabled={saving} onChange={(e) => setDateIso(e.target.value)} className={INPUT_CLASSES} />
      </label>
      {categories.length > 0 && (
        <label className={LABEL_CLASSES}>
          Categoría (opcional)
          <select value={categoryId} disabled={saving} onChange={(e) => setCategoryId(e.target.value)} className={INPUT_CLASSES}>
            <option value="">Sin clasificar</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {error && <p className="text-sm text-danger-text">{error}</p>}
      <button
        type="button"
        disabled={saving}
        onClick={() => void handleSubmit()}
        className="mt-2 min-h-11 rounded-md border border-brand bg-brand px-4 py-3 text-base font-bold text-surface hover:bg-brand-hover"
      >
        Añadir movimiento
      </button>
    </>
  )
}

export type ManualEntryPanelMode = 'account' | 'movement' | null

interface ManualEntryPanelProps {
  mode: ManualEntryPanelMode
  manualAccounts: Account[]
  categories: RealCategory[]
  onClose: () => void
  onCreateAccount: (name: string, fn: AccountFunction, startingBalanceCents: number) => Promise<string | null>
  onAddMovement: (accountId: string, description: string, amountCents: number, dateIso: string, categoryId: string | null) => Promise<string | null>
  onDone: () => void
}

/** Panel real: crear una cuenta manual, o añadir un movimiento a mano a una ya existente. */
export function ManualEntryPanel({ mode, manualAccounts, categories, onClose, onCreateAccount, onAddMovement, onDone }: ManualEntryPanelProps) {
  return (
    <SidePanel open={mode !== null} onOpenChange={(next) => !next && onClose()}>
      {mode === 'account' && <CreateManualAccountForm onCreate={onCreateAccount} onDone={onDone} />}
      {mode === 'movement' && <AddManualMovementForm manualAccounts={manualAccounts} categories={categories} onAdd={onAddMovement} onDone={onDone} />}
    </SidePanel>
  )
}
