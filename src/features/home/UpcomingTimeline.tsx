import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { SectionLabel } from '../../components/SectionLabel'
import { hitos, next14Days, timelineDays, timelineEvents } from '../../data/demo'
import { formatMoney } from '../../lib/format'
import { useHomeUIStore } from '../../store/useHomeUIStore'

const TIER_BOTTOM: Record<string, string> = {
  today: 'bottom-8', // 32px
  lower: 'bottom-5', // 20px
  upper: 'bottom-[66px]',
}

/**
 * Bloque 4 — Próximos 14 días. Eje de 15 días con marcadores en posición absoluta
 * y alturas alternas para que ningún importe se solape. Los importes nunca se
 * envuelven: cada marcador es de una sola línea (white-space: nowrap).
 */
export function UpcomingTimeline() {
  const mode = useHomeUIStore((s) => s.mode)

  return (
    <Card className="flex flex-col gap-5" padding="lg">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h2 className="font-serif text-[26px] font-semibold text-ink">
            Salen {formatMoney(next14Days.totalOut)} y entran {formatMoney(next14Days.totalIn)} en los próximos 14 días
          </h2>
          <div className="mt-1.5 text-base text-ink-muted">{next14Days.rangeLabel}</div>
        </div>
        <a href="#pagos-y-suscripciones" className="border-b border-green text-base font-semibold text-green">
          Ver pagos y suscripciones
        </a>
      </div>

      <div className="flex flex-col gap-2.5 lg:hidden">
        {timelineEvents
          .filter((event) => event.tier !== 'today')
          .map((event) => (
            <div key={`${event.column}-${event.label}`} className="flex items-center justify-between gap-3 text-base tabular">
              <span className={event.amount > 0 ? 'font-semibold text-green-text' : 'text-ink'}>
                {event.day} · {event.label}
              </span>
              <Money
                value={event.amount}
                signed={event.amount > 0}
                tone={event.amount > 0 ? 'green' : 'ink'}
                className="shrink-0 whitespace-nowrap font-bold"
              />
            </div>
          ))}
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <div className="min-w-[820px]">
          <div className="grid min-h-[150px] grid-cols-[repeat(15,1fr)] items-end gap-x-1">
            {timelineEvents.map((event) => {
              const isToday = event.tier === 'today'
              const isInflow = event.amount > 0
              const amountTone = isToday ? 'green' : isInflow ? 'green' : 'danger'
              const stickWidth = isToday || isInflow ? 'w-[3px]' : 'w-[2px]'
              const stickHeight = isToday ? 'h-[26px]' : event.tier === 'lower' ? 'h-3.5' : 'h-[60px]'
              const stickColor = isToday || isInflow ? 'bg-green' : 'bg-[#c4ccc8]'
              const alignRight = event.align === 'right'

              return (
                <div
                  key={`${event.column}-${event.label}`}
                  className="relative flex h-full flex-col items-center justify-end"
                  style={{ gridColumn: event.column }}
                >
                  <div
                    className={`absolute whitespace-nowrap ${TIER_BOTTOM[event.tier]} ${
                      alignRight ? 'right-0 text-right' : 'left-1/2 -translate-x-1/2 text-center'
                    }`}
                  >
                    {isToday ? (
                      <div className="text-sm font-bold text-green-text">Hoy</div>
                    ) : (
                      <>
                        <div className={`text-sm ${isInflow ? 'font-semibold text-green-text' : 'text-ink-muted'}`}>
                          {event.label}
                        </div>
                        <Money
                          value={event.amount}
                          signed={isInflow}
                          tone={amountTone}
                          className={`block font-bold ${isInflow ? 'text-[17px]' : 'text-base'}`}
                        />
                      </>
                    )}
                  </div>
                  <div className={`${stickWidth} ${stickHeight} rounded-sm ${stickColor}`} />
                </div>
              )
            })}
          </div>

          <div className="my-5 h-0.5 bg-line" />
          <div className="grid grid-cols-[repeat(15,1fr)] gap-x-1 text-center text-[13px] text-ink-muted tabular">
            {timelineDays.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
        </div>
      </div>

      {mode === 'detalle' && (
        <div className="border-t border-line pt-4">
          <SectionLabel className="mb-3">Tabla de los mismos hitos</SectionLabel>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full border-collapse tabular">
              <thead>
                <tr>
                  {['Fecha', 'Concepto', 'Tipo', 'Cuenta'].map((h) => (
                    <th
                      key={h}
                      className="border-b border-line py-2 pr-4 text-left text-[13px] font-semibold tracking-[0.06em] text-ink-muted uppercase"
                    >
                      {h}
                    </th>
                  ))}
                  <th className="border-b border-line py-2 text-right text-[13px] font-semibold tracking-[0.06em] text-ink-muted uppercase">
                    Importe
                  </th>
                </tr>
              </thead>
              <tbody>
                {hitos.map((h) => (
                  <tr key={`${h.fecha}-${h.concepto}`}>
                    <td className="border-b border-[#f0f3f1] py-2.5 pr-4 text-base whitespace-nowrap text-ink">{h.fecha}</td>
                    <td className="border-b border-[#f0f3f1] py-2.5 pr-4 text-base font-semibold text-ink">{h.concepto}</td>
                    <td className="border-b border-[#f0f3f1] py-2.5 pr-4 text-base text-ink-muted">{h.tipo}</td>
                    <td className="border-b border-[#f0f3f1] py-2.5 pr-4 text-base whitespace-nowrap text-ink-muted">{h.cuenta}</td>
                    <td className="border-b border-[#f0f3f1] py-2.5 text-right text-base font-bold whitespace-nowrap">
                      <Money value={h.importe} tone={h.importe > 0 ? 'green' : 'ink'} signed={h.importe > 0} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2.5 lg:hidden">
            {hitos.map((h) => (
              <div
                key={`${h.fecha}-${h.concepto}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-line p-3.5 tabular"
              >
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold text-ink">{h.concepto}</div>
                  <div className="mt-0.5 truncate text-sm text-ink-muted">
                    {h.fecha} · {h.tipo} · {h.cuenta}
                  </div>
                </div>
                <Money
                  value={h.importe}
                  tone={h.importe > 0 ? 'green' : 'ink'}
                  signed={h.importe > 0}
                  className="shrink-0 whitespace-nowrap font-bold"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
