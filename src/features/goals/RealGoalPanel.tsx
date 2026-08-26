import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'
import { SectionLabel } from '../../components/SectionLabel'
import { SidePanel } from '../../components/SidePanel'
import type { RealGoal } from './useRealGoals'

const LABEL_CLASSES = 'flex flex-col gap-1.5 text-sm font-semibold text-ink-muted'
const INPUT_CLASSES = 'min-h-11 rounded-md border border-line px-3 py-[11px] text-base text-ink'

interface CreateFormProps {
  onCreate: (name: string, targetCents: number, monthlyContributionCents: number) => Promise<string | null>
  onDone: () => void
}

function CreateGoalForm({ onCreate, onDone }: CreateFormProps) {
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [monthly, setMonthly] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setSaving(true)
    setError(null)
    const err = await onCreate(name, Math.round(Number(target) * 100), Math.round(Number(monthly || '0') * 100))
    setSaving(false)
    if (err) setError(err)
    else onDone()
  }

  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <SectionLabel>Nuevo objetivo</SectionLabel>
          <Dialog.Title className="mt-1 font-serif text-[26px] font-semibold text-ink">Crear objetivo</Dialog.Title>
        </div>
        <Dialog.Close asChild>
          <button type="button" aria-label="Cerrar panel" className="flex h-11 w-11 items-center justify-center rounded-md border border-line bg-surface text-lg text-ink">
            ✕
          </button>
        </Dialog.Close>
      </div>
      <label className={LABEL_CLASSES}>
        Nombre
        <input value={name} disabled={saving} onChange={(e) => setName(e.target.value)} placeholder="p. ej. Viaje a Japón" className={INPUT_CLASSES} />
      </label>
      <label className={LABEL_CLASSES}>
        Importe objetivo
        <input type="number" min={0} step={10} value={target} disabled={saving} onChange={(e) => setTarget(e.target.value)} className={INPUT_CLASSES} />
      </label>
      <label className={LABEL_CLASSES}>
        Aportación mensual estimada (opcional)
        <input type="number" min={0} step={10} value={monthly} disabled={saving} onChange={(e) => setMonthly(e.target.value)} className={INPUT_CLASSES} />
      </label>
      {error && <p className="text-sm text-danger-text">{error}</p>}
      <button
        type="button"
        disabled={saving}
        onClick={() => void handleSubmit()}
        className="mt-2 min-h-11 rounded-md border border-brand bg-brand px-4 py-3 text-base font-bold text-surface hover:bg-brand-hover"
      >
        Crear objetivo
      </button>
    </>
  )
}

interface EditFormProps {
  goal: RealGoal
  onUpdate: (id: string, name: string, targetCents: number, monthlyContributionCents: number) => Promise<string | null>
  onDone: () => void
}

function EditGoalForm({ goal, onUpdate, onDone }: EditFormProps) {
  const [name, setName] = useState(goal.name)
  const [target, setTarget] = useState(String(goal.targetCents / 100))
  const [monthly, setMonthly] = useState(String(goal.monthlyContributionCents / 100))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setSaving(true)
    setError(null)
    const err = await onUpdate(goal.id, name, Math.round(Number(target) * 100), Math.round(Number(monthly || '0') * 100))
    setSaving(false)
    if (err) setError(err)
    else onDone()
  }

  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <SectionLabel>Editar objetivo</SectionLabel>
          <Dialog.Title className="mt-1 font-serif text-[26px] font-semibold text-ink">Editar objetivo</Dialog.Title>
        </div>
        <Dialog.Close asChild>
          <button type="button" aria-label="Cerrar panel" className="flex h-11 w-11 items-center justify-center rounded-md border border-line bg-surface text-lg text-ink">
            ✕
          </button>
        </Dialog.Close>
      </div>
      <label className={LABEL_CLASSES}>
        Nombre
        <input value={name} disabled={saving} onChange={(e) => setName(e.target.value)} className={INPUT_CLASSES} />
      </label>
      <label className={LABEL_CLASSES}>
        Importe objetivo
        <input type="number" min={0} step={10} value={target} disabled={saving} onChange={(e) => setTarget(e.target.value)} className={INPUT_CLASSES} />
      </label>
      <label className={LABEL_CLASSES}>
        Aportación mensual estimada (opcional)
        <input type="number" min={0} step={10} value={monthly} disabled={saving} onChange={(e) => setMonthly(e.target.value)} className={INPUT_CLASSES} />
      </label>
      {error && <p className="text-sm text-danger-text">{error}</p>}
      <button
        type="button"
        disabled={saving}
        onClick={() => void handleSubmit()}
        className="mt-2 min-h-11 rounded-md border border-brand bg-brand px-4 py-3 text-base font-bold text-surface hover:bg-brand-hover"
      >
        Guardar cambios
      </button>
    </>
  )
}

interface ContributeFormProps {
  goals: RealGoal[]
  onContribute: (goalId: string, currentSavedCents: number, amountCents: number) => Promise<string | null>
  onDone: () => void
}

function ContributeForm({ goals, onContribute, onDone }: ContributeFormProps) {
  const [goalId, setGoalId] = useState(goals[0]?.id ?? '')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    const goal = goals.find((g) => g.id === goalId)
    if (!goal) return
    setSaving(true)
    setError(null)
    const err = await onContribute(goal.id, goal.savedCents, Math.round(Number(amount) * 100))
    setSaving(false)
    if (err) setError(err)
    else onDone()
  }

  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <SectionLabel>Registrar aportación</SectionLabel>
          <Dialog.Title className="mt-1 font-serif text-[26px] font-semibold text-ink">Registrar aportación</Dialog.Title>
        </div>
        <Dialog.Close asChild>
          <button type="button" aria-label="Cerrar panel" className="flex h-11 w-11 items-center justify-center rounded-md border border-line bg-surface text-lg text-ink">
            ✕
          </button>
        </Dialog.Close>
      </div>
      <label className={LABEL_CLASSES}>
        Objetivo
        <select value={goalId} disabled={saving} onChange={(e) => setGoalId(e.target.value)} className={INPUT_CLASSES}>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </label>
      <label className={LABEL_CLASSES}>
        Importe
        <input type="number" min={0} step={10} value={amount} disabled={saving} onChange={(e) => setAmount(e.target.value)} className={INPUT_CLASSES} />
      </label>
      {error && <p className="text-sm text-danger-text">{error}</p>}
      <button
        type="button"
        disabled={saving || goals.length === 0}
        onClick={() => void handleSubmit()}
        className="mt-2 min-h-11 rounded-md border border-brand bg-brand px-4 py-3 text-base font-bold text-surface hover:bg-brand-hover"
      >
        Confirmar aportación
      </button>
    </>
  )
}

export type RealGoalPanelMode = 'create' | 'contribute' | 'edit' | null

interface RealGoalPanelProps {
  mode: RealGoalPanelMode
  goals: RealGoal[]
  editingGoal?: RealGoal | null
  onClose: () => void
  onCreate: (name: string, targetCents: number, monthlyContributionCents: number) => Promise<string | null>
  onContribute: (goalId: string, currentSavedCents: number, amountCents: number) => Promise<string | null>
  onUpdate: (id: string, name: string, targetCents: number, monthlyContributionCents: number) => Promise<string | null>
  onDone: () => void
}

/** Panel real: crear, editar o registrar una aportación a un objetivo. */
export function RealGoalPanel({ mode, goals, editingGoal, onClose, onCreate, onContribute, onUpdate, onDone }: RealGoalPanelProps) {
  return (
    <SidePanel open={mode !== null} onOpenChange={(next) => !next && onClose()}>
      {mode === 'create' && <CreateGoalForm onCreate={onCreate} onDone={onDone} />}
      {mode === 'contribute' && <ContributeForm goals={goals} onContribute={onContribute} onDone={onDone} />}
      {mode === 'edit' && editingGoal && <EditGoalForm goal={editingGoal} onUpdate={onUpdate} onDone={onDone} />}
    </SidePanel>
  )
}
