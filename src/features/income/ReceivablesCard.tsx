import { useState } from 'react'
import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { createReceivable, settleReceivable, type Receivable } from './useRealReceivables'

function ReceivableRow({ receivable, onSettled }: { receivable: Receivable; onSettled: (id: string, message: string) => void }) {
  const [settling, setSettling] = useState(false)

  async function handleSettle() {
    setSettling(true)
    const error = await settleReceivable(receivable.id)
    setSettling(false)
    if (!error) onSettled(receivable.id, `Cobro de ${receivable.name} registrado.`)
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#f0f3f1] py-3 last:border-b-0">
      <div>
        <div className="text-base font-semibold text-ink">{receivable.name}</div>
        <Money value={receivable.amountCents / 100} decimals={2} className="text-sm text-ink-muted" />
      </div>
      <button
        type="button"
        disabled={settling}
        onClick={() => void handleSettle()}
        className="min-h-9 rounded-md border border-brand px-3 text-sm font-semibold text-brand hover:bg-brand-soft disabled:opacity-60"
      >
        {settling ? 'Guardando…' : 'Marcar cobro'}
      </button>
    </div>
  )
}

/** Dinero que te debe alguien — nunca se mezcla con tus propios ingresos ni con las deudas que tú debes (esas van en Deudas). */
export function ReceivablesCard({
  receivables,
  onRefetch,
  onSettled,
}: {
  receivables: Receivable[]
  onRefetch: () => void
  onSettled: (id: string, message: string) => void
}) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalCents = receivables.reduce((sum, r) => sum + r.amountCents, 0)

  async function handleAdd() {
    setSaving(true)
    setError(null)
    const err = await createReceivable(name, Math.round(Number(amount || '0') * 100))
    setSaving(false)
    if (err) setError(err)
    else {
      setName('')
      setAmount('')
      onRefetch()
    }
  }

  return (
    <Card padding="lg" className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-[22px] lg:text-[19px] font-semibold text-ink">Te deben</h2>
          <p className="text-[15px] text-ink-muted">Dinero que alguien te debe a ti — no cuenta como tu ingreso hasta que lo marques como cobrado.</p>
        </div>
        {receivables.length > 0 && <Money value={totalCents / 100} decimals={0} serif className="shrink-0 text-[22px] font-semibold text-ink" />}
      </div>
      {receivables.length > 0 && (
        <div className="flex flex-col">
          {receivables.map((r) => (
            <ReceivableRow key={r.id} receivable={r} onSettled={onSettled} />
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink-muted">
          Quién te debe
          <input
            value={name}
            disabled={saving}
            onChange={(e) => setName(e.target.value)}
            placeholder="p. ej. Marcos (viaje de mayo)"
            className="min-h-11 rounded-md border border-line px-3 py-2 text-base text-ink"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink-muted">
          Importe
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={0}
              step={10}
              value={amount}
              disabled={saving}
              onChange={(e) => setAmount(e.target.value)}
              className="min-h-11 w-28 rounded-md border border-line px-3 py-2 text-right text-base text-ink"
            />
            <span className="text-ink-muted">€</span>
          </div>
        </label>
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleAdd()}
          className="min-h-11 rounded-md border border-brand bg-brand px-3.5 text-base font-semibold text-surface hover:bg-brand-hover disabled:opacity-60"
        >
          Añadir
        </button>
      </div>
      {error && <p className="text-sm text-danger-text">{error}</p>}
    </Card>
  )
}
