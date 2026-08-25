import { useState } from 'react'
import { Badge } from '../../components/Badge'
import { Card } from '../../components/Card'
import { Skeleton } from '../../components/states/Skeleton'
import { BUDGET_MONTH_START_OPTIONS, CURRENCY_OPTIONS, DATE_FORMAT_OPTIONS } from '../../data/settings'
import { useAuthStore } from '../../lib/supabase/useAuth'
import { useSettingsStore } from './store'
import { useRealSettings } from './useRealSettings'

/** Ajustes básicos: moneda, formato de fecha, inicio del mes presupuestario y borrado de datos de demostración. */
export function SettingsBasics() {
  const session = useAuthStore((s) => s.session)
  const isAuthenticated = session !== null
  const demoCurrency = useSettingsStore((s) => s.currency)
  const demoDateFormat = useSettingsStore((s) => s.dateFormat)
  const demoBudgetMonthStart = useSettingsStore((s) => s.budgetMonthStart)
  const setDemoCurrency = useSettingsStore((s) => s.setCurrency)
  const setDemoDateFormat = useSettingsStore((s) => s.setDateFormat)
  const setDemoBudgetMonthStart = useSettingsStore((s) => s.setBudgetMonthStart)
  const demoDataCleared = useSettingsStore((s) => s.demoDataCleared)
  const clearDemoData = useSettingsStore((s) => s.clearDemoData)

  const { loading: loadingReal, settings: realSettings, save } = useRealSettings()
  const [saveError, setSaveError] = useState<string | null>(null)

  // Nunca mostrar la moneda/formato por defecto de la demo mientras tus
  // ajustes reales, ya guardados, todavía se están leyendo.
  if (isAuthenticated && (loadingReal || realSettings === null)) {
    return (
      <Card padding="lg" className="flex flex-col gap-5">
        <h2 className="font-serif text-[22px] font-semibold text-ink">Ajustes básicos</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Skeleton className="h-[68px] w-full" label="Cargando tus ajustes reales…" />
          <Skeleton className="h-[68px] w-full" />
          <Skeleton className="h-[68px] w-full" />
        </div>
      </Card>
    )
  }

  const currency = isAuthenticated ? realSettings!.currency : demoCurrency
  const dateFormat = isAuthenticated ? realSettings!.dateFormat : demoDateFormat
  const budgetMonthStart = isAuthenticated ? realSettings!.budgetMonthStart : demoBudgetMonthStart

  async function handleCurrency(value: string) {
    if (isAuthenticated) setSaveError(await save({ currency: value }))
    else setDemoCurrency(value)
  }

  async function handleDateFormat(value: string) {
    if (isAuthenticated) setSaveError(await save({ dateFormat: value }))
    else setDemoDateFormat(value)
  }

  async function handleBudgetMonthStart(value: number) {
    if (isAuthenticated) setSaveError(await save({ budgetMonthStart: value }))
    else setDemoBudgetMonthStart(value)
  }

  return (
    <Card padding="lg" className="flex flex-col gap-5">
      <h2 className="font-serif text-[22px] font-semibold text-ink">Ajustes básicos</h2>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[15px] font-semibold text-ink">Moneda</span>
          <select
            value={currency}
            onChange={(e) => void handleCurrency(e.target.value)}
            className="min-h-11 rounded-md border border-line bg-surface px-3.5 text-base text-ink"
          >
            {CURRENCY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[15px] font-semibold text-ink">Formato de fecha</span>
          <select
            value={dateFormat}
            onChange={(e) => void handleDateFormat(e.target.value)}
            className="min-h-11 rounded-md border border-line bg-surface px-3.5 text-base text-ink"
          >
            {DATE_FORMAT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[15px] font-semibold text-ink">Inicio del mes presupuestario</span>
          <select
            value={budgetMonthStart}
            onChange={(e) => void handleBudgetMonthStart(Number(e.target.value))}
            className="min-h-11 rounded-md border border-line bg-surface px-3.5 text-base text-ink tabular"
          >
            {BUDGET_MONTH_START_OPTIONS.map((day) => (
              <option key={day} value={day}>
                Día {day}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isAuthenticated && saveError && <div className="text-[15px] text-danger-text">{saveError}</div>}

      {!isAuthenticated && (
        <div className="flex flex-wrap items-center gap-4 border-t border-line pt-4">
          <div>
            <div className="text-base font-semibold text-ink">Borrar datos de demostración</div>
            <div className="text-[15px] text-ink-muted">Restablece las cuentas, movimientos y objetivos ficticios de esta demo.</div>
          </div>
          {demoDataCleared ? (
            <Badge variant="success">Datos de demostración restablecidos</Badge>
          ) : (
            <button
              type="button"
              onClick={clearDemoData}
              className="min-h-11 rounded-md border border-danger-line bg-surface px-[18px] text-base font-semibold text-danger-text hover:bg-danger-bg"
            >
              Borrar datos de demostración
            </button>
          )}
        </div>
      )}
    </Card>
  )
}
