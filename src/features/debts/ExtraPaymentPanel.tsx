import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'
import { Money } from '../../components/Money'
import { SectionLabel } from '../../components/SectionLabel'
import { SidePanel } from '../../components/SidePanel'
import { CONTEXT_DATE } from '../../data/demo'
import { debts } from '../../data/debts'
import { formatDuration, formatMonthYearShort, simulateExtraPayment } from './domain'
import { useDebtsStore } from './store'

const amortizingDebts = debts.filter((d) => d.monthlyPayment !== null)

function SimulatorForm() {
  const [debtId, setDebtId] = useState(amortizingDebts[0].id)
  const [extra, setExtra] = useState(3000)
  const debt = amortizingDebts.find((d) => d.id === debtId) ?? amortizingDebts[0]

  const result = simulateExtraPayment(debt.balance, debt.annualRate, debt.monthlyPayment!, extra, CONTEXT_DATE)

  return (
    <>
      <div className="flex items-start justify-between">
        <Dialog.Title className="font-serif text-[26px] font-semibold text-ink">Pago extraordinario</Dialog.Title>
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
        Elige una deuda y un importe extra para ver, en una simulación, cuánto ahorras y cuánto adelantas el fin.
      </Dialog.Description>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink-muted">
        Deuda
        <select
          value={debtId}
          onChange={(e) => setDebtId(e.target.value)}
          className="min-h-11 rounded-md border border-line bg-surface px-3 py-[11px] text-base text-ink"
        >
          {amortizingDebts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} · {d.institution}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink-muted">
        Importe extra
        <input
          type="number"
          min={0}
          step={100}
          value={extra}
          onChange={(e) => setExtra(Math.max(0, Number(e.target.value)))}
          className="min-h-12 rounded-md border border-line px-3.5 py-3 text-xl font-bold text-ink tabular"
        />
      </label>

      <div className="flex flex-col gap-2.5 rounded-[14px] border border-green-soft-line bg-green-soft p-[18px] tabular">
        <SectionLabel className="text-green-text">Resultado de la simulación</SectionLabel>
        <div className="flex justify-between text-[17px] text-ink">
          <span>Intereses que te ahorras</span>
          <Money value={Math.max(0, result.interestSaved)} decimals={0} className="font-bold" />
        </div>
        <div className="flex justify-between text-[17px] text-ink">
          <span>Tiempo que adelantas</span>
          <span className="font-bold">{formatDuration(result.monthsSaved)}</span>
        </div>
        <div className="flex justify-between text-[17px] text-ink">
          <span>Nueva fecha de fin</span>
          <span className="font-bold">
            {result.newPayoffDate ? formatMonthYearShort(result.newPayoffDate) : 'indefinida'}
          </span>
        </div>
      </div>

      <button
        type="button"
        className="min-h-11 rounded-md border border-green bg-green px-4 py-3 text-base font-bold text-surface hover:bg-green-hover"
      >
        Programar el pago extra
      </button>
    </>
  )
}

/** Panel simulador de pago extraordinario: importe → intereses ahorrados, tiempo y nueva fecha de fin. */
export function ExtraPaymentPanel() {
  const open = useDebtsStore((s) => s.simulatorOpen)
  const closeSimulator = useDebtsStore((s) => s.closeSimulator)

  return (
    <SidePanel
      open={open}
      onOpenChange={(next) => !next && closeSimulator()}
      onCloseAutoFocus={(event) => {
        event.preventDefault()
        setTimeout(() => {
          document.getElementById('simular-pago-btn')?.focus()
        }, 0)
      }}
    >
      {open && <SimulatorForm />}
    </SidePanel>
  )
}
