import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'
import { Money } from '../../components/Money'
import { SidePanel } from '../../components/SidePanel'
import { CONTEXT_DATE } from '../../data/demo'
import { emergencyFund, goals } from '../../data/goals'
import { formatMonthYearShort, goalForecast } from './domain'
import { useGoalsStore, type ContributionTargetId } from './store'

interface Target {
  id: ContributionTargetId
  name: string
  saved: number
  target: number
  monthlyContribution: number
}

function useTargets(): Target[] {
  const extraSaved = useGoalsStore((s) => s.extraSaved)
  return [
    {
      id: 'emergencia',
      name: 'Fondo de emergencia',
      saved: emergencyFund.saved + extraSaved.emergencia,
      target: emergencyFund.target,
      monthlyContribution: emergencyFund.monthlyContribution,
    },
    ...goals.map((g) => ({
      id: g.id,
      name: g.name,
      saved: g.saved + (extraSaved[g.id] ?? 0),
      target: g.target,
      monthlyContribution: g.monthlyContribution,
    })),
  ]
}

function AllocateForm({ targets, onConfirm }: { targets: Target[]; onConfirm: (allocations: Record<string, number>) => void }) {
  const [allocations, setAllocations] = useState<Record<string, number>>({
    emergencia: 200,
    japon: 100,
    reforma: 0,
  })
  const total = Object.values(allocations).reduce((sum, v) => sum + v, 0)

  const changes = targets
    .map((t) => {
      const allocated = allocations[t.id] ?? 0
      const before = goalForecast(t.saved, t.target, t.monthlyContribution, CONTEXT_DATE)
      const after = goalForecast(t.saved + allocated, t.target, t.monthlyContribution, CONTEXT_DATE)
      return { target: t, allocated, before, after }
    })
    .filter((c) => c.allocated > 0 && c.before.projectedDate && c.after.projectedDate)

  return (
    <>
      <div className="flex items-start justify-between">
        <Dialog.Title className="font-serif text-[26px] font-semibold text-ink">Registrar aportación</Dialog.Title>
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

      <Dialog.Description className="text-base text-ink-muted">
        Introduce un importe y repártelo entre tus objetivos. La fecha estimada de cada uno se actualiza antes de
        confirmar.
      </Dialog.Description>

      <div className="flex flex-col gap-1.5 text-sm font-semibold text-ink-muted">
        Importe total a repartir
        <div className="tabular flex min-h-12 items-center rounded-md border border-line px-3.5 py-3 text-xl font-bold text-ink">
          <Money value={total} decimals={0} />
        </div>
      </div>

      <div className="flex flex-col gap-3.5">
        {targets.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-3">
            <label htmlFor={`allocate-${t.id}`} className="text-base font-semibold text-ink">
              {t.name}
            </label>
            <span className="flex items-center gap-1.5">
              <input
                id={`allocate-${t.id}`}
                type="number"
                min={0}
                step={10}
                value={allocations[t.id] ?? 0}
                onChange={(e) =>
                  setAllocations((prev) => ({ ...prev, [t.id]: Math.max(0, Number(e.target.value)) }))
                }
                className="min-h-11 w-28 rounded-md border border-line px-3 py-2 text-right text-base tabular"
              />
              <span className="text-ink-muted">€</span>
            </span>
          </div>
        ))}
      </div>

      {changes.length > 0 && (
        <div className="flex flex-col gap-2 rounded-[14px] bg-canvas p-4 tabular">
          <div className="text-sm font-bold text-ink">Cómo cambia la fecha estimada</div>
          {changes.map(({ target, before, after }) => (
            <div key={target.id} className="flex justify-between text-[15px] text-ink">
              <span>{target.name}</span>
              <span className="font-bold">
                {formatMonthYearShort(before.projectedDate!)} → {formatMonthYearShort(after.projectedDate!)}
              </span>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        disabled={total <= 0}
        onClick={() => onConfirm(allocations)}
        className="min-h-11 rounded-md border border-brand bg-brand px-4 py-3 text-base font-bold text-surface hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        Confirmar aportación
      </button>
    </>
  )
}

/** Panel Registrar aportación: reparte un importe entre objetivos con vista previa en vivo. */
export function AllocatePanel() {
  const open = useGoalsStore((s) => s.panelOpen)
  const closePanel = useGoalsStore((s) => s.closePanel)
  const confirmContribution = useGoalsStore((s) => s.confirmContribution)
  const targets = useTargets()

  return (
    <SidePanel
      open={open}
      onOpenChange={(next) => !next && closePanel()}
      onCloseAutoFocus={(event) => {
        event.preventDefault()
        setTimeout(() => {
          document.getElementById('registrar-aportacion-btn')?.focus()
        }, 0)
      }}
    >
      {open && (
        <AllocateForm
          targets={targets}
          onConfirm={(allocations) => confirmContribution(allocations as Record<ContributionTargetId, number>)}
        />
      )}
    </SidePanel>
  )
}
