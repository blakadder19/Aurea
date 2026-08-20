import { Badge } from '../../components/Badge'
import { Card } from '../../components/Card'
import { BUDGET_MONTH_START_OPTIONS, CURRENCY_OPTIONS, DATE_FORMAT_OPTIONS } from '../../data/settings'
import { useSettingsStore } from './store'

/** Ajustes básicos: moneda, formato de fecha, inicio del mes presupuestario y borrado de datos de demostración. */
export function SettingsBasics() {
  const currency = useSettingsStore((s) => s.currency)
  const dateFormat = useSettingsStore((s) => s.dateFormat)
  const budgetMonthStart = useSettingsStore((s) => s.budgetMonthStart)
  const setCurrency = useSettingsStore((s) => s.setCurrency)
  const setDateFormat = useSettingsStore((s) => s.setDateFormat)
  const setBudgetMonthStart = useSettingsStore((s) => s.setBudgetMonthStart)
  const demoDataCleared = useSettingsStore((s) => s.demoDataCleared)
  const clearDemoData = useSettingsStore((s) => s.clearDemoData)

  return (
    <Card padding="lg" className="flex flex-col gap-5">
      <h2 className="font-serif text-[22px] font-semibold text-ink">Ajustes básicos</h2>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[15px] font-semibold text-ink">Moneda</span>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
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
            onChange={(e) => setDateFormat(e.target.value)}
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
            onChange={(e) => setBudgetMonthStart(Number(e.target.value))}
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
    </Card>
  )
}
