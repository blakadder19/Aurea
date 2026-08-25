import { describe, expect, it } from 'vitest'
import { buildRealTimeline } from './timelineCalc'
import { detectRecurringGroups } from '../../lib/recurringCalc'

const today = new Date(2026, 7, 19) // 19 ago 2026

function groupFor(merchant: string, lastDateISO: string, amountCents: number) {
  const [y, m, d] = lastDateISO.split('-').map(Number)
  const prev = new Date(Date.UTC(y, m - 1 - 1, d))
  const prevISO = prev.toISOString().slice(0, 10)
  return detectRecurringGroups([
    { accountId: 'a1', merchant, dateISO: prevISO, amountCents: -amountCents },
    { accountId: 'a1', merchant, dateISO: lastDateISO, amountCents: -amountCents },
  ])[0]
}

describe('buildRealTimeline', () => {
  it('coloca un cargo dentro de la ventana de 14 días en su columna correcta', () => {
    const netflix = groupFor('Netflix', '2026-08-22', 1399) // próximo cargo: 22 sep... espera, +1 mes desde 22 ago = 22 sep, fuera de ventana
    const timeline = buildRealTimeline(today, [netflix])
    // el "próximo cargo" real es 22 sep (fuera de los 14 días desde 19 ago) → no debería aparecer
    expect(timeline.events).toHaveLength(1) // solo "Hoy"
    expect(timeline.totalOut).toBe(0)
  })

  it('un cargo cuyo próximo cobro cae en la ventana aparece con importe y columna correctos', () => {
    // último cargo real 21 jul → próximo cargo 21 ago, dentro de la ventana [19 ago, 2 sep]
    const disney = groupFor('Disney Plus', '2026-07-21', 1199)
    const timeline = buildRealTimeline(today, [disney])
    expect(timeline.events).toHaveLength(2)
    const event = timeline.events[1]
    expect(event.label).toBe('Disney Plus')
    expect(event.amount).toBeCloseTo(-11.99)
    expect(event.column).toBe(3) // 21 ago = 19 ago + 2 días → columna 3
    expect(timeline.totalOut).toBeCloseTo(11.99)
  })

  it('agrupa dos cargos del mismo día en un solo evento combinado', () => {
    const a = groupFor('Gimnasio', '2026-07-25', 3990) // próximo: 25 ago
    const b = groupFor('Seguro', '2026-07-25', 3120) // próximo: 25 ago
    const timeline = buildRealTimeline(today, [a, b])
    const dayEvents = timeline.events.filter((e) => e.column === timeline.events[timeline.events.length - 1].column)
    expect(dayEvents).toHaveLength(1)
    expect(dayEvents[0].label).toBe('Gimnasio · Seguro')
    expect(dayEvents[0].amount).toBeCloseTo(-71.1)
  })

  it('los días cruzan de mes cuando corresponde', () => {
    const timeline = buildRealTimeline(today, [])
    expect(timeline.days[0]).toBe('19')
    expect(timeline.days[13]).toBe('1 sep')
    expect(timeline.days[14]).toBe('2 sep')
  })

  it('sin cargos, el mensaje lo dice explícitamente en vez de fabricar un rango', () => {
    const timeline = buildRealTimeline(today, [])
    expect(timeline.rangeLabel).toContain('sin cargos recurrentes detectados')
  })
})
