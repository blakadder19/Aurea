import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { augustCalendarDays, income31Ago } from '../../data/recurring'

const WEEKDAY_HEADERS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

/**
 * Vista Calendario: rejilla de agosto con el total del día en una sola línea.
 * Solo informativo (como la referencia): el detalle se abre desde la Lista.
 */
export function RecurringCalendar() {
  const cells = augustCalendarDays()

  return (
    <Card padding="lg">
      <div className="mb-4 text-xl font-bold text-ink">Agosto de 2026</div>

      <div className="mb-2 grid grid-cols-7 gap-2 text-center text-[13px] font-semibold text-ink-muted">
        {WEEKDAY_HEADERS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 auto-rows-[92px] gap-2">
        {cells.map((cell, i) => {
          if (cell.day === null) return <div key={`empty-${i}`} />

          const isToday = cell.day === 19
          const total = cell.items.reduce((sum, item) => sum + item.amount, 0)
          const income = cell.day === 31 ? income31Ago.amount : 0
          const label = cell.items.length > 1 ? `${cell.items.length} cargos` : cell.items[0]?.shortName

          return (
            <div
              key={cell.day}
              className={`flex flex-col gap-1 overflow-hidden rounded-md border p-2 text-[15px] ${
                isToday ? 'border-2 border-green text-green-text font-bold' : 'border-line text-ink'
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
