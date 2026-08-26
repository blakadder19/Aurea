import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'
import { SectionLabel } from '../../components/SectionLabel'
import { SidePanel } from '../../components/SidePanel'

const LABEL_CLASSES = 'flex flex-col gap-1.5 text-sm font-semibold text-ink-muted'
const INPUT_CLASSES = 'min-h-11 rounded-md border border-line px-3 py-[11px] text-base text-ink'

interface AddManualRecurringPanelProps {
  open: boolean
  onClose: () => void
  onCreate: (name: string, amountCents: number, nextChargeDateIso: string | null) => Promise<string | null>
  onDone: () => void
}

/** Alta de un recurrente a mano — para cargos que Áurea no ve (efectivo, otra entidad) o que aún no han cobrado. */
export function AddManualRecurringPanel({ open, onClose, onCreate, onDone }: AddManualRecurringPanelProps) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [nextChargeDate, setNextChargeDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setName('')
    setAmount('')
    setNextChargeDate('')
    setError(null)
  }

  async function handleSubmit() {
    setSaving(true)
    setError(null)
    const err = await onCreate(name, Math.round(Number(amount) * 100), nextChargeDate || null)
    setSaving(false)
    if (err) setError(err)
    else {
      reset()
      onDone()
    }
  }

  return (
    <SidePanel
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          reset()
          onClose()
        }
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <SectionLabel>Nuevo recurrente</SectionLabel>
          <Dialog.Title className="mt-1 font-serif text-[26px] font-semibold text-ink">Añadir recurrente</Dialog.Title>
        </div>
        <Dialog.Close asChild>
          <button type="button" aria-label="Cerrar panel" className="flex h-11 w-11 items-center justify-center rounded-md border border-line bg-surface text-lg text-ink">
            ✕
          </button>
        </Dialog.Close>
      </div>
      <p className="text-[15px] text-ink-muted">
        Para un cargo mensual que Áurea no puede ver en tus movimientos — pagado en efectivo o por otra vía.
      </p>
      <label className={LABEL_CLASSES}>
        Nombre
        <input value={name} disabled={saving} onChange={(e) => setName(e.target.value)} placeholder="p. ej. Cuota del club" className={INPUT_CLASSES} />
      </label>
      <label className={LABEL_CLASSES}>
        Importe mensual
        <input type="number" min={0} step={0.5} value={amount} disabled={saving} onChange={(e) => setAmount(e.target.value)} className={INPUT_CLASSES} />
      </label>
      <label className={LABEL_CLASSES}>
        Próximo cargo (opcional)
        <input type="date" value={nextChargeDate} disabled={saving} onChange={(e) => setNextChargeDate(e.target.value)} className={INPUT_CLASSES} />
      </label>
      {error && <p className="text-sm text-danger-text">{error}</p>}
      <button
        type="button"
        disabled={saving}
        onClick={() => void handleSubmit()}
        className="mt-2 min-h-11 rounded-md border border-brand bg-brand px-4 py-3 text-base font-bold text-surface hover:bg-brand-hover"
      >
        Añadir recurrente
      </button>
    </SidePanel>
  )
}
