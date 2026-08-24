import { describe, expect, it } from 'vitest'
import { detectDuplicates, detectRecurringGroups, monthCalendarDays, priceIncreaseCents, type RawCharge } from './recurringCalc'

const acc1 = 'acc-1'
const acc2 = 'acc-2'

describe('detectRecurringGroups', () => {
  it('detecta un cargo mensual consistente (30-31 días)', () => {
    const charges: RawCharge[] = [
      { accountId: acc1, merchant: 'Disney Plus', dateISO: '2026-06-21', amountCents: -1199 },
      { accountId: acc1, merchant: 'Disney Plus', dateISO: '2026-07-21', amountCents: -1199 },
      { accountId: acc1, merchant: 'Disney Plus', dateISO: '2026-08-21', amountCents: -1199 },
    ]
    const groups = detectRecurringGroups(charges)
    expect(groups).toHaveLength(1)
    expect(groups[0].lastAmountCents).toBe(1199)
    expect(groups[0].prevAmountCents).toBe(1199)
    expect(groups[0].nextChargeDateISO).toBe('2026-09-21')
  })

  it('descarta comercios frecuentes con espaciado irregular', () => {
    const charges: RawCharge[] = [
      { accountId: acc1, merchant: 'Deliveroo', dateISO: '2026-06-04', amountCents: -1355 },
      { accountId: acc1, merchant: 'Deliveroo', dateISO: '2026-06-23', amountCents: -3791 },
      { accountId: acc1, merchant: 'Deliveroo', dateISO: '2026-08-23', amountCents: -1570 },
    ]
    expect(detectRecurringGroups(charges)).toHaveLength(0)
  })

  it('exige al menos 2 ocurrencias', () => {
    const charges: RawCharge[] = [{ accountId: acc1, merchant: 'Netflix', dateISO: '2026-08-21', amountCents: -1399 }]
    expect(detectRecurringGroups(charges)).toHaveLength(0)
  })

  it('descarta un cargo en 0 (retención/autorización pendiente)', () => {
    const charges: RawCharge[] = [
      { accountId: acc1, merchant: 'Flyefit', dateISO: '2026-06-10', amountCents: 0 },
      { accountId: acc1, merchant: 'Flyefit', dateISO: '2026-07-10', amountCents: 0 },
      { accountId: acc1, merchant: 'Flyefit', dateISO: '2026-08-10', amountCents: 0 },
    ]
    expect(detectRecurringGroups(charges)).toHaveLength(0)
  })

  it('rechaza un hueco de 41 días (fuera del rango) y acepta 40', () => {
    const tooFar: RawCharge[] = [
      { accountId: acc1, merchant: 'Gomo', dateISO: '2026-06-01', amountCents: -1500 },
      { accountId: acc1, merchant: 'Gomo', dateISO: '2026-07-12', amountCents: -1500 }, // 41 días
    ]
    expect(detectRecurringGroups(tooFar)).toHaveLength(0)

    const justRight: RawCharge[] = [
      { accountId: acc1, merchant: 'Gomo', dateISO: '2026-06-01', amountCents: -1500 },
      { accountId: acc1, merchant: 'Gomo', dateISO: '2026-07-11', amountCents: -1500 }, // 40 días
    ]
    expect(detectRecurringGroups(justRight)).toHaveLength(1)
  })

  it('separa grupos por cuenta aunque el comercio sea el mismo', () => {
    const charges: RawCharge[] = [
      { accountId: acc1, merchant: 'Gimnasio', dateISO: '2026-06-01', amountCents: -3990 },
      { accountId: acc1, merchant: 'Gimnasio', dateISO: '2026-07-01', amountCents: -3990 },
      { accountId: acc2, merchant: 'Gimnasio', dateISO: '2026-06-01', amountCents: -3990 },
      { accountId: acc2, merchant: 'Gimnasio', dateISO: '2026-07-01', amountCents: -3990 },
    ]
    expect(detectRecurringGroups(charges)).toHaveLength(2)
  })
})

describe('priceIncreaseCents', () => {
  it('devuelve la diferencia solo si el último importe subió', () => {
    const [up] = detectRecurringGroups([
      { accountId: acc1, merchant: 'Spotify', dateISO: '2026-07-24', amountCents: -1099 },
      { accountId: acc1, merchant: 'Spotify', dateISO: '2026-08-24', amountCents: -1199 },
    ])
    expect(priceIncreaseCents(up)).toBe(100)

    const [down] = detectRecurringGroups([
      { accountId: acc1, merchant: 'Google One', dateISO: '2026-06-01', amountCents: -799 },
      { accountId: acc1, merchant: 'Google One', dateISO: '2026-07-01', amountCents: -499 },
    ])
    expect(priceIncreaseCents(down)).toBeNull()
  })
})

describe('detectDuplicates', () => {
  it('empareja el mismo importe en cuentas distintas a pocos días', () => {
    const groups = detectRecurringGroups([
      { accountId: acc1, merchant: 'Gimnasio A', dateISO: '2026-07-01', amountCents: -3990 },
      { accountId: acc1, merchant: 'Gimnasio A', dateISO: '2026-08-01', amountCents: -3990 },
      { accountId: acc2, merchant: 'Gimnasio B', dateISO: '2026-07-02', amountCents: -3990 },
      { accountId: acc2, merchant: 'Gimnasio B', dateISO: '2026-08-02', amountCents: -3990 },
    ])
    const dups = detectDuplicates(groups)
    expect(dups).toHaveLength(1)
    expect(dups[0].dayDiff).toBe(1)
  })

  it('no empareja mismo importe en la misma cuenta', () => {
    const groups = detectRecurringGroups([
      { accountId: acc1, merchant: 'A', dateISO: '2026-07-01', amountCents: -1000 },
      { accountId: acc1, merchant: 'A', dateISO: '2026-08-01', amountCents: -1000 },
      { accountId: acc1, merchant: 'B', dateISO: '2026-07-02', amountCents: -1000 },
      { accountId: acc1, merchant: 'B', dateISO: '2026-08-02', amountCents: -1000 },
    ])
    expect(detectDuplicates(groups)).toHaveLength(0)
  })
})

describe('monthCalendarDays', () => {
  it('coloca cada grupo en el día de su próximo cargo dentro del mes pedido', () => {
    const groups = detectRecurringGroups([
      { accountId: acc1, merchant: 'Netflix', dateISO: '2026-07-22', amountCents: -1399 },
      { accountId: acc1, merchant: 'Netflix', dateISO: '2026-08-22', amountCents: -1399 }, // próximo: 22 sep
    ])
    const septCells = monthCalendarDays(2026, 8, groups) // septiembre = índice 8
    const day22 = septCells.find((c) => c.day === 22)
    expect(day22?.dedupeKeys).toEqual([groups[0].dedupeKey])

    const augCells = monthCalendarDays(2026, 7, groups)
    expect(augCells.every((c) => c.dedupeKeys.length === 0)).toBe(true)
  })

  it('devuelve filas completas de 7 columnas', () => {
    const cells = monthCalendarDays(2026, 7, [])
    expect(cells.length % 7).toBe(0)
  })
})
