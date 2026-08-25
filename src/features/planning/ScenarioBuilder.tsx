import { Card } from '../../components/Card'
import { HORIZON_OPTIONS } from '../../data/planning'
import type { ScenarioParams } from './domain'
import { usePlanningStore } from './store'

function formatPercent1(value: number): string {
  return `${value.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`
}

function formatEuros(value: number): string {
  return `${value.toLocaleString('es-ES', { useGrouping: 'always' })} €`
}

interface SliderRowProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  valueLabel: string
  onChange: (value: number) => void
}

function SliderRow({ label, value, min, max, step, valueLabel, onChange }: SliderRowProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-[15px] font-semibold text-ink">
        <span>{label}</span>
        <span className="tabular text-ink-muted">{valueLabel}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-11 w-full cursor-pointer accent-green"
      />
    </label>
  )
}

interface AmountFieldProps {
  label: string
  value: number
  onChange: (value: number) => void
}

function AmountField({ label, value, onChange }: AmountFieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[15px] font-semibold text-ink">{label}</span>
      <input
        type="number"
        min={0}
        step={100}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        className="min-h-11 rounded-md border border-line px-3.5 py-2.5 text-base text-ink tabular"
      />
    </label>
  )
}

/** Panel izquierdo de 380 px: controles del escenario editable, todos con efecto en vivo. */
export function ScenarioBuilder() {
  const params = usePlanningStore((s) => s.params)
  const horizonYears = usePlanningStore((s) => s.horizonYears)
  const setParam = usePlanningStore((s) => s.setParam)
  const setHorizonYears = usePlanningStore((s) => s.setHorizonYears)

  const set = <K extends keyof ScenarioParams>(key: K) => (value: ScenarioParams[K]) => setParam(key, value)

  return (
    <Card padding="lg" className="flex w-full flex-col gap-5 lg:w-[380px] lg:shrink-0">
      <h2 className="font-serif text-[22px] lg:text-[19px] font-semibold text-ink">Constructor de escenarios</h2>

      <SliderRow
        label="Ingresos mensuales"
        value={params.ingresos}
        min={0}
        max={Math.max(6000, Math.ceil(params.ingresos / 500) * 500)}
        step={10}
        valueLabel={formatEuros(params.ingresos)}
        onChange={set('ingresos')}
      />
      <SliderRow
        label="Gastos mensuales"
        value={params.gastos}
        min={0}
        max={Math.max(3500, Math.ceil(params.gastos / 500) * 500)}
        step={10}
        valueLabel={formatEuros(params.gastos)}
        onChange={set('gastos')}
      />
      <SliderRow
        label="Aportación a inversión"
        value={params.aportacion}
        min={0}
        max={1000}
        step={10}
        valueLabel={`${formatEuros(params.aportacion)}/mes`}
        onChange={set('aportacion')}
      />
      <SliderRow
        label="Rentabilidad anual esperada"
        value={params.rentabilidad}
        min={0}
        max={10}
        step={0.5}
        valueLabel={formatPercent1(params.rentabilidad)}
        onChange={set('rentabilidad')}
      />
      <SliderRow
        label="Inflación"
        value={params.inflacion}
        min={0}
        max={6}
        step={0.5}
        valueLabel={formatPercent1(params.inflacion)}
        onChange={set('inflacion')}
      />

      <AmountField label="Compra extraordinaria" value={params.compraExtraordinaria} onChange={set('compraExtraordinaria')} />
      <AmountField label="Pago extra de deuda" value={params.pagoExtraDeuda} onChange={set('pagoExtraDeuda')} />

      <label className="flex flex-col gap-1.5">
        <span className="text-[15px] font-semibold text-ink">Horizonte</span>
        <select
          value={horizonYears}
          onChange={(e) => setHorizonYears(Number(e.target.value))}
          className="min-h-11 rounded-md border border-line bg-surface px-3.5 py-2.5 text-base text-ink"
        >
          {HORIZON_OPTIONS.map((years) => (
            <option key={years} value={years}>
              {years} años
            </option>
          ))}
        </select>
      </label>
    </Card>
  )
}
