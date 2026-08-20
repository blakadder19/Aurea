import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'
import { SectionLabel } from '../../components/SectionLabel'
import { SidePanel } from '../../components/SidePanel'
import { budgetCategories } from '../../data/budget'
import { useBudgetStore } from './store'

interface FormProps {
  initialBudgets: Record<string, number>
  onSave: (values: Record<string, number>) => void
}

function AdjustForm({ initialBudgets, onSave }: FormProps) {
  const [draft, setDraft] = useState(initialBudgets)

  return (
    <>
      <div>
        <SectionLabel>Ajustar presupuesto</SectionLabel>
        <Dialog.Title className="mt-1 font-serif text-[26px] font-semibold text-ink">
          Presupuesto por categoría
        </Dialog.Title>
      </div>
      <Dialog.Description className="text-base text-ink-muted">
        Cambia el importe presupuestado de cada categoría. Los cambios se guardan solo en esta sesión.
      </Dialog.Description>

      <div className="flex flex-col gap-4">
        {budgetCategories.map((c) => (
          <label key={c.id} className="flex items-center justify-between gap-4 text-base text-ink">
            <span className="font-semibold">{c.name}</span>
            <span className="flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                step={10}
                value={draft[c.id] ?? c.budgeted}
                onChange={(e) => setDraft((d) => ({ ...d, [c.id]: Number(e.target.value) }))}
                aria-label={`Presupuesto de ${c.name}`}
                className="min-h-11 w-24 rounded-md border border-line px-3 py-2 text-right tabular"
              />
              <span className="text-ink-muted">€</span>
            </span>
          </label>
        ))}
      </div>

      <Dialog.Close asChild>
        <button
          type="button"
          onClick={() => onSave(draft)}
          className="mt-2 min-h-11 rounded-md border border-green bg-green px-4 py-3 text-base font-bold text-surface hover:bg-green-hover"
        >
          Guardar cambios
        </button>
      </Dialog.Close>
    </>
  )
}

/**
 * Panel real de ajuste: cada categoría tiene su importe presupuestado editable
 * en local (sin persistencia). Al guardar, recalcula los KPIs del bloque 1.
 */
export function AdjustBudgetPanel() {
  const open = useBudgetStore((s) => s.panelOpen)
  const closePanel = useBudgetStore((s) => s.closePanel)
  const categoryBudgets = useBudgetStore((s) => s.categoryBudgets)
  const saveBudgets = useBudgetStore((s) => s.saveBudgets)

  return (
    <SidePanel
      open={open}
      onOpenChange={(next) => !next && closePanel()}
      onCloseAutoFocus={(event) => {
        event.preventDefault()
        // Igual que en Movimientos: sin esto Radix a veces deja el foco en <body>.
        setTimeout(() => {
          document.getElementById('ajustar-presupuesto-btn')?.focus()
        }, 0)
      }}
    >
      {open && <AdjustForm initialBudgets={categoryBudgets} onSave={saveBudgets} />}
    </SidePanel>
  )
}
