import { useState } from 'react'
import { Card } from '../../components/Card'
import { createDeclaredIncome, INCOME_TYPE_LABELS, INCOME_TYPES, setDeclaredIncomeActive, type DeclaredIncome, type IncomeType } from '../../lib/declaredIncome'

function IncomeRow({ income, onChanged }: { income: DeclaredIncome; onChanged: () => void }) {
  const [saving, setSaving] = useState(false)

  async function handleToggle() {
    setSaving(true)
    await setDeclaredIncomeActive(income.id, !income.active)
    setSaving(false)
    onChanged()
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#f0f3f1] py-3 last:border-b-0">
      <div>
        <div className={`text-base font-semibold ${income.active ? 'text-ink' : 'text-ink-muted line-through'}`}>{income.name}</div>
        <div className="text-sm text-ink-muted">
          {(income.amountCents / 100).toLocaleString('es-ES', { minimumFractionDigits: 2 })} € al mes
          {income.incomeType && ` · ${INCOME_TYPE_LABELS[income.incomeType]}`}
        </div>
      </div>
      <button
        type="button"
        disabled={saving}
        onClick={() => void handleToggle()}
        className="min-h-9 rounded-md border border-line px-3 text-sm font-semibold text-ink hover:bg-canvas disabled:opacity-60"
      >
        {income.active ? 'Desactivar' : 'Activar'}
      </button>
    </div>
  )
}

/** Ingresos declarados a mano (sueldo en efectivo, cuenta no conectada...) — se suman a lo detectado en movimientos. */
export function DeclaredIncomesCard({ incomes, onRefetch }: { incomes: DeclaredIncome[]; onRefetch: () => void }) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [incomeType, setIncomeType] = useState<IncomeType | ''>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd() {
    setSaving(true)
    setError(null)
    const err = await createDeclaredIncome(name, Math.round(Number(amount || '0') * 100), incomeType || null)
    setSaving(false)
    if (err) setError(err)
    else {
      setName('')
      setAmount('')
      setIncomeType('')
      onRefetch()
    }
  }

  return (
    <Card padding="lg" className="flex flex-col gap-3">
      <div>
        <h2 className="font-serif text-[22px] lg:text-[19px] font-semibold text-ink">Ingresos declarados</h2>
        <p className="text-[15px] text-ink-muted">
          Un sueldo en efectivo o de una cuenta que Áurea no ve — se suma aparte a lo que ya se detecta en tus movimientos, nunca lo sustituye.
        </p>
      </div>
      {incomes.length > 0 && (
        <div className="flex flex-col">
          {incomes.map((i) => (
            <IncomeRow key={i.id} income={i} onChanged={onRefetch} />
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink-muted">
          Nombre
          <input
            value={name}
            disabled={saving}
            onChange={(e) => setName(e.target.value)}
            placeholder="p. ej. Sueldo en efectivo"
            className="min-h-11 rounded-md border border-line px-3 py-2 text-base text-ink"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink-muted">
          Importe mensual
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
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink-muted">
          Tipo (opcional)
          <select
            value={incomeType}
            disabled={saving}
            onChange={(e) => setIncomeType(e.target.value as IncomeType | '')}
            className="min-h-11 rounded-md border border-line bg-surface px-3 py-2 text-base text-ink"
          >
            <option value="">Sin especificar</option>
            {INCOME_TYPES.map((t) => (
              <option key={t} value={t}>
                {INCOME_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
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
