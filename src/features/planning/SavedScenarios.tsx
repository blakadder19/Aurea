import { useState } from 'react'
import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import type { ScenarioParams } from './domain'
import { projectedNetWorth } from './domain'
import { usePlanningStore } from './store'
import { deletePlanningScenario, savePlanningScenario, useRealPlanningScenarios } from './useRealPlanningScenarios'
import { useAuthStore } from '../../lib/supabase/useAuth'

const LABEL_COLOR: Record<string, string> = {
  optimista: 'text-warning-text',
  base: 'text-brand-text',
  pesimista: 'text-danger-text',
}

interface ScenarioVariant {
  id: 'optimista' | 'base' | 'pesimista'
  label: string
  caption: string
  apply: (base: ScenarioParams) => ScenarioParams
}

const VARIANTS: ScenarioVariant[] = [
  { id: 'optimista', label: 'Optimista', caption: 'Rentabilidad 7 % · sin imprevistos', apply: (base) => ({ ...base, rentabilidad: 7 }) },
  { id: 'base', label: 'Base', caption: 'Rentabilidad 5 % · situación actual', apply: (base) => ({ ...base }) },
  {
    id: 'pesimista',
    label: 'Pesimista',
    caption: 'Rentabilidad 2 % · un imprevisto grande',
    apply: (base) => ({ ...base, rentabilidad: 2, compraExtraordinaria: 12000 }),
  },
]

/** Tres escenarios guardados (variaciones sobre el escenario base real o demo), proyectados al horizonte seleccionado. */
export function SavedScenarios() {
  const session = useAuthStore((s) => s.session)
  const isAuthenticated = session !== null
  const horizonYears = usePlanningStore((s) => s.horizonYears)
  const startingNetWorth = usePlanningStore((s) => s.startingNetWorth)
  const avgDebtRate = usePlanningStore((s) => s.avgDebtRate)
  const baseParams = usePlanningStore((s) => s.baseParams)
  const params = usePlanningStore((s) => s.params)
  const loadScenario = usePlanningStore((s) => s.loadScenario)

  const { scenarios: customScenarios, refetch } = useRealPlanningScenarios()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    const err = await savePlanningScenario(name, params)
    setSaving(false)
    if (err) setError(err)
    else {
      setName('')
      refetch()
    }
  }

  async function handleDelete(id: string) {
    setError(null)
    const err = await deletePlanningScenario(id)
    setConfirmingDeleteId(null)
    if (err) setError(err)
    else refetch()
  }

  return (
    <Card padding="lg" className="flex flex-col gap-4">
      <h2 className="font-serif text-[22px] lg:text-[19px] font-semibold text-ink">Escenarios guardados</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {VARIANTS.map((scenario) => {
          const value = projectedNetWorth(startingNetWorth, scenario.apply(baseParams), horizonYears * 12, avgDebtRate)
          const isBase = scenario.id === 'base'
          return (
            <div
              key={scenario.id}
              className={`flex flex-col gap-2 rounded-[14px] border p-[18px] ${
                isBase ? 'border-2 border-brand' : 'border-line'
              }`}
            >
              <div className={`text-[15px] font-bold ${LABEL_COLOR[scenario.id] ?? 'text-ink'}`}>{scenario.label}</div>
              <Money value={value} decimals={0} className="text-[22px] font-bold" />
              <div className="text-sm text-ink-muted">{scenario.caption}</div>
            </div>
          )
        })}
      </div>

      {isAuthenticated && (
        <>
          {customScenarios.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {customScenarios.map((scenario) => {
                const value = projectedNetWorth(startingNetWorth, scenario.params, horizonYears * 12, avgDebtRate)
                return (
                  <div key={scenario.id} className="flex flex-col gap-2 rounded-[14px] border border-line p-[18px]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-[15px] font-bold text-ink">{scenario.name}</div>
                      {confirmingDeleteId === scenario.id ? (
                        <div className="flex shrink-0 gap-1.5 text-sm">
                          <button type="button" onClick={() => void handleDelete(scenario.id)} className="font-semibold text-danger-text underline hover:no-underline">
                            Sí, borrar
                          </button>
                          <button type="button" onClick={() => setConfirmingDeleteId(null)} className="text-ink-muted underline hover:no-underline">
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmingDeleteId(scenario.id)}
                          aria-label={`Borrar escenario ${scenario.name}`}
                          className="shrink-0 text-ink-muted hover:text-danger-text"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <button type="button" onClick={() => loadScenario(scenario.params)} className="flex flex-col gap-2 text-left">
                      <Money value={value} decimals={0} className="text-[22px] font-bold" />
                      <div className="text-sm text-ink-muted">Tu configuración guardada · toca para cargarla</div>
                    </button>
                  </div>
                )
              })}
            </div>
          )}
          <div className="flex flex-wrap items-end gap-2.5 border-t border-line pt-4">
            <label className="flex flex-1 min-w-[180px] flex-col gap-1.5">
              <span className="text-sm font-semibold text-ink-muted">Guardar la configuración actual</span>
              <input
                value={name}
                disabled={saving}
                onChange={(e) => setName(e.target.value)}
                placeholder="p. ej. Mi plan a 10 años"
                className="min-h-11 rounded-md border border-line px-3.5 py-2.5 text-base text-ink"
              />
            </label>
            <button
              type="button"
              disabled={saving || !name.trim()}
              onClick={() => void handleSave()}
              className="min-h-11 rounded-md border border-brand bg-brand px-[18px] py-2.5 text-base font-semibold text-surface hover:bg-brand-hover disabled:opacity-60"
            >
              Guardar escenario
            </button>
          </div>
          {error && <p className="text-sm text-danger-text">{error}</p>}
        </>
      )}
    </Card>
  )
}
