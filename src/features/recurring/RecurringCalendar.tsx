import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { augustCalendarDays, income31Ago, type RecurringItem } from '../../data/recurring'
import { monthCalendarDays, type DetectedGroup } from '../../lib/recurringCalc'

const WEEKDAY_HEADERS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTHS_FULL = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

interface RealCalendarProps {
  groups: DetectedGroup[]
  items: RecurringItem[]
}

interface RecurringCalendarProps {
  real?: RealCalendarProps
}

/**
 * Vista Calendario: rejilla del mes con el total del día en una sola línea.
 * Solo informativo (como la referencia): el detalle se abre desde la Lista.
 * En real, sin ingreso fabricado: solo se muestran cargos detectados.
 */
export function RecurringCalendar({ real }: RecurringCalendarProps = {}) {
  const today = new Date()
  const year = real ? today.getFullYear() : 2026
  const monthIndex0 = real ? today.getMonth() : 7
  const todayDay = real ? today.getDate() : 19

  const itemById = new Map((real?.items ?? []).map((i) => [i.id, i]))
  const cells = real
    ? monthCalendarDays(year, monthIndex0, real.groups).map((c) => ({
        day: c.day,
        items: c.dedupeKeys.map((k) => itemById.get(k)).filter((i): i is RecurringItem => !!i),
      }))
    : augustCalendarDays()

  return (
    <Card padding="lg">
      <div className="mb-4 text-xl font-bold text-ink">
        {MONTHS_FULL[monthIndex0]} de {year}
      </div>

      <div className="mb-2 grid grid-cols-7 gap-2 text-center text-[13px] font-semibold text-ink-muted">
        {WEEKDAY_HEADERS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 auto-rows-[92px] gap-2">
        {cells.map((cell, i) => {
          if (cell.day === null) return <div key={`empty-${i}`} />

          const isToday = cell.day === todayDay
          const total = cell.items.reduce((sum, item) => sum + item.amount, 0)
          const income = !real && cell.day === 31 ? income31Ago.amount : 0
          const label = cell.items.length > 1 ? `${cell.items.length} cargos` : cell.items[0]?.shortName

          return (
            <div
              key={cell.day}
              className={`flex flex-col gap-1 overflow-hidden rounded-md border p-2 text-[15px] ${
                isToday ? 'border-2 border-brand text-brand-text font-bold' : 'border-line text-ink'
              }`}
            >
              <span>{cell.day}</span>
              {total > 0 && (
                <span className="flex flex-col" title={cell.items.map((i) => i.name).join(', ')}>
                  <span className="truncate text-[13px] text-ink-muted">{label}</span>
                  <span className="text-[13px] font-bold whitespace-nowrap text-danger-text">
                    <Money value={total} />
                  </span>
                </span>
              )}
              {income > 0 && (
                <span className="flex flex-col">
                  <span className="truncate text-[13px] text-ink-muted">{income31Ago.label}</span>
                  <span className="text-[13px] font-bold whitespace-nowrap text-green-text">
                    <Money value={income} signed tone="green" />
                  </span>
                </span>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
