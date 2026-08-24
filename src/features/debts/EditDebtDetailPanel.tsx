import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'
import { SectionLabel } from '../../components/SectionLabel'
import { SidePanel } from '../../components/SidePanel'
import type { RealDebt } from './useRealDebts'

const LABEL_CLASSES = 'flex flex-col gap-1.5 text-sm font-semibold text-ink-muted'
const INPUT_CLASSES = 'min-h-11 rounded-md border border-line px-3 py-[11px] text-base text-ink'

interface FormProps {
  debt: RealDebt
  onSave: (accountId: string, annualRateBps: number, monthlyPaymentCents: number | null, nextPaymentDate: string | null) => Promise<string | null>
  onDone: () => void
}

function EditForm({ debt, onSave, onDone }: FormProps) {
  const [rate, setRate] = useState(String(debt.annualRateBps / 100))
  const [payment, setPayment] = useState(debt.monthlyPaymentCents !== null ? String(Math.round(debt.monthlyPaymentCents / 100)) : '')
  const [noFixedPayment, setNoFixedPayment] = useState(debt.monthlyPaymentCents === null)
  const [nextDate, setNextDate] = useState(debt.nextPaymentDate ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setSaving(true)
    setError(null)
    const annualRateBps = Math.round(Number(rate || '0') * 100)
    const monthlyPaymentCents = noFixedPayment ? null : Math.round(Number(payment || '0') * 100)
    const err = await onSave(debt.accountId, annualRateBps, monthlyPaymentCents, nextDate || null)
    setSaving(false)
    if (err) setError(err)
    else onDone()
  }

  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <SectionLabel>Editar detalle</SectionLabel>
          <Dialog.Title className="mt-1 font-serif text-[26px] font-semibold text-ink">{debt.name}</Dialog.Title>
        </div>
        <Dialog.Close asChild>
          <button type="button" aria-label="Cerrar panel" className="flex h-11 w-11 items-center justify-center rounded-md border border-line bg-surface text-lg text-ink">
            ✕
          </button>
        </Dialog.Close>
      </div>
      <Dialog.Description className="text-base text-ink-muted">
        Tu banco no nos da estos datos por la conexión — los guardas tú, y se usan para calcular el fin previsto y el simulador de pago extraordinario.
      </Dialog.Description>

      <label className={LABEL_CLASSES}>
        Tipo de interés anual (%)
        <input type="number" min={0} step={0.01} value={rate} disabled={saving} onChange={(e) => setRate(e.target.value)} className={INPUT_CLASSES} />
      </label>

      <label className="flex items-center gap-2 text-sm font-semibold text-ink-muted">
        <input type="checkbox" checked={noFixedPayment} disabled={saving} onChange={(e) => setNoFixedPayment(e.target.checked)} className="h-4 w-4" />
        Sin cuota fija (p. ej. tarjeta de crédito revolving)
      </label>

      {!noFixedPayment && (
        <label className={LABEL_CLASSES}>
          Cuota mensual
          <input type="number" min={0} step={1} value={payment} disabled={saving} onChange={(e) => setPayment(e.target.value)} className={INPUT_CLASSES} />
        </label>
      )}

      <label className={LABEL_CLASSES}>
        Próximo pago (opcional)
        <input type="date" value={nextDate} disabled={saving} onChange={(e) => setNextDate(e.target.value)} className={INPUT_CLASSES} />
      </label>

      {error && <p className="text-sm text-danger-text">{error}</p>}
      <button
        type="button"
        disabled={saving}
        onClick={() => void handleSubmit()}
        className="mt-2 min-h-11 rounded-md border border-green bg-green px-4 py-3 text-base font-bold text-surface hover:bg-green-hover"
      >
        Guardar cambios
      </button>
    </>
  )
}

interface EditDebtDetailPanelProps {
  debt: RealDebt | null
  onClose: () => void
  onSave: (accountId: string, annualRateBps: number, monthlyPaymentCents: number | null, nextPaymentDate: string | null) => Promise<string | null>
  onDone: () => void
}

export function EditDebtDetailPanel({ debt, onClose, onSave, onDone }: EditDebtDetailPanelProps) {
  return (
    <SidePanel open={debt !== null} onOpenChange={(next) => !next && onClose()}>
      {debt && <EditForm key={debt.accountId} debt={debt} onSave={onSave} onDone={onDone} />}
    </SidePanel>
  )
}
