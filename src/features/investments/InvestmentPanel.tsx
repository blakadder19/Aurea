import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'
import { SectionLabel } from '../../components/SectionLabel'
import { SidePanel } from '../../components/SidePanel'
import type { RealInvestment } from './useRealInvestments'

const LABEL_CLASSES = 'flex flex-col gap-1.5 text-sm font-semibold text-ink-muted'
const INPUT_CLASSES = 'min-h-11 rounded-md border border-line px-3 py-[11px] text-base text-ink'

export interface InvestmentFormValues {
  name: string
  productType: string
  units: number | null
  avgCostCents: number | null
  valueCents: number
  contributedCents: number
}

interface FormProps {
  initial: RealInvestment | null
  onSave: (id: string | undefined, values: InvestmentFormValues) => Promise<string | null>
  onDone: () => void
}

function InvestmentForm({ initial, onSave, onDone }: FormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [productType, setProductType] = useState(initial?.productType ?? '')
  const [units, setUnits] = useState(initial?.units !== null && initial?.units !== undefined ? String(initial.units) : '')
  const [avgCost, setAvgCost] = useState(initial?.avgCostCents !== null && initial?.avgCostCents !== undefined ? String(initial.avgCostCents / 100) : '')
  const [value, setValue] = useState(initial ? String(initial.valueCents / 100) : '')
  const [contributed, setContributed] = useState(initial ? String(initial.contributedCents / 100) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setSaving(true)
    setError(null)
    const err = await onSave(initial?.id, {
      name,
      productType,
      units: units.trim() ? Number(units) : null,
      avgCostCents: avgCost.trim() ? Math.round(Number(avgCost) * 100) : null,
      valueCents: Math.round(Number(value || '0') * 100),
      contributedCents: Math.round(Number(contributed || '0') * 100),
    })
    setSaving(false)
    if (err) setError(err)
    else onDone()
  }

  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <SectionLabel>{initial ? 'Editar posición' : 'Nueva posición'}</SectionLabel>
          <Dialog.Title className="mt-1 font-serif text-[26px] font-semibold text-ink">
            {initial ? initial.name : 'Añadir posición'}
          </Dialog.Title>
        </div>
        <Dialog.Close asChild>
          <button type="button" aria-label="Cerrar panel" className="flex h-11 w-11 items-center justify-center rounded-md border border-line bg-surface text-lg text-ink">
            ✕
          </button>
        </Dialog.Close>
      </div>
      <Dialog.Description className="text-base text-ink-muted">
        No hay cotización en vivo: actualiza el valor a mano cuando quieras.
      </Dialog.Description>

      <label className={LABEL_CLASSES}>
        Nombre
        <input value={name} disabled={saving} onChange={(e) => setName(e.target.value)} placeholder="p. ej. Fondo indexado mundial" className={INPUT_CLASSES} />
      </label>
      <label className={LABEL_CLASSES}>
        Tipo de producto
        <input value={productType} disabled={saving} onChange={(e) => setProductType(e.target.value)} placeholder="p. ej. Fondos de inversión, Cripto…" className={INPUT_CLASSES} />
      </label>
      <label className={LABEL_CLASSES}>
        Valor actual
        <input type="number" min={0} step={1} value={value} disabled={saving} onChange={(e) => setValue(e.target.value)} className={INPUT_CLASSES} />
      </label>
      <label className={LABEL_CLASSES}>
        Aportado hasta ahora
        <input type="number" min={0} step={1} value={contributed} disabled={saving} onChange={(e) => setContributed(e.target.value)} className={INPUT_CLASSES} />
      </label>
      <label className={LABEL_CLASSES}>
        Unidades (opcional)
        <input type="number" min={0} step={0.01} value={units} disabled={saving} onChange={(e) => setUnits(e.target.value)} className={INPUT_CLASSES} />
      </label>
      <label className={LABEL_CLASSES}>
        Coste medio por unidad (opcional)
        <input type="number" min={0} step={0.01} value={avgCost} disabled={saving} onChange={(e) => setAvgCost(e.target.value)} className={INPUT_CLASSES} />
      </label>

      {error && <p className="text-sm text-danger-text">{error}</p>}
      <button
        type="button"
        disabled={saving}
        onClick={() => void handleSubmit()}
        className="mt-2 min-h-11 rounded-md border border-brand bg-brand px-4 py-3 text-base font-bold text-surface hover:bg-brand-hover"
      >
        Guardar
      </button>
    </>
  )
}

interface InvestmentPanelProps {
  open: boolean
  initial: RealInvestment | null
  onClose: () => void
  onSave: (id: string | undefined, values: InvestmentFormValues) => Promise<string | null>
  onDone: () => void
}

export function InvestmentPanel({ open, initial, onClose, onSave, onDone }: InvestmentPanelProps) {
  return (
    <SidePanel open={open} onOpenChange={(next) => !next && onClose()}>
      {open && <InvestmentForm key={initial?.id ?? 'new'} initial={initial} onSave={onSave} onDone={onDone} />}
    </SidePanel>
  )
}
