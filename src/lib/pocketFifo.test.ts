import { describe, expect, it } from 'vitest'
import { convertPocketSpendFifo, type PocketMovement } from './pocketFifo'

function credit(
  id: string,
  accountId: string,
  currency: string,
  amountCents: number,
  dateISO: string,
  exchangeRate: string | null = null,
): PocketMovement {
  return { id, accountId, currency, amountCents, dateISO, exchangeRate, exchangeRateUnitCurrency: exchangeRate ? 'EUR' : null }
}

function spend(id: string, accountId: string, currency: string, amountCents: number, dateISO: string): PocketMovement {
  return { id, accountId, currency, amountCents: -amountCents, dateISO, exchangeRate: null, exchangeRateUnitCurrency: null }
}

describe('convertPocketSpendFifo', () => {
  it('sin movimientos no convierte nada', () => {
    const out = convertPocketSpendFifo([])
    expect(out.eurCentsById.size).toBe(0)
    expect(out.uncoveredCentsById.size).toBe(0)
  })

  it('un gasto usa la tasa del lote que lo respalda', () => {
    // 100,00 zł a 4,0 son 25,00 €; gastar 40,00 zł son 10,00 €.
    const out = convertPocketSpendFifo([
      credit('c1', 'pln', 'PLN', 10_000, '2026-08-01', '4.0'),
      spend('g1', 'pln', 'PLN', 4_000, '2026-08-02'),
    ])
    expect(out.eurCentsById.get('g1')).toBe(1_000)
    expect(out.uncoveredCentsById.size).toBe(0)
  })

  it('un gasto a caballo entre dos lotes se lleva las dos tasas, sin promediarlas', () => {
    // 60 zł del lote a 4,0 (15,00 €) + 40 zł del lote a 5,0 (8,00 €) = 23,00 €.
    // La media de las tasas (4,5) daría 22,22 € — que es justo lo que no se hace.
    const out = convertPocketSpendFifo([
      credit('c1', 'pln', 'PLN', 6_000, '2026-08-01', '4.0'),
      credit('c2', 'pln', 'PLN', 4_000, '2026-08-01', '5.0'),
      spend('g1', 'pln', 'PLN', 10_000, '2026-08-02'),
    ])
    expect(out.eurCentsById.get('g1')).toBe(2_300)
  })

  it('dentro del mismo día, primero entra lo que entra', () => {
    // Si el gasto se ordenara antes que el abono, quedaría sin cubrir.
    const out = convertPocketSpendFifo([
      spend('g1', 'pln', 'PLN', 4_000, '2026-08-01'),
      credit('c1', 'pln', 'PLN', 10_000, '2026-08-01', '4.0'),
    ])
    expect(out.eurCentsById.get('g1')).toBe(1_000)
    expect(out.uncoveredCentsById.size).toBe(0)
  })

  // Lo que pidió Alejandro: que no esté escrito para el zloty ------------------

  it('dos divisas a la vez llevan colas independientes y no se mezclan', () => {
    const out = convertPocketSpendFifo([
      // Pocket de zlotys: 200 zł a 4,0.
      credit('pln-c', 'acc-pln', 'PLN', 20_000, '2026-08-01', '4.0'),
      // Pocket de coronas: 200 SEK a 10,0.
      credit('sek-c', 'acc-sek', 'SEK', 20_000, '2026-08-01', '10.0'),
      // Mismo importe nominal en las dos, mismo día: distinto euro.
      spend('pln-g', 'acc-pln', 'PLN', 20_000, '2026-08-02'),
      spend('sek-g', 'acc-sek', 'SEK', 20_000, '2026-08-02'),
    ])
    expect(out.eurCentsById.get('pln-g')).toBe(5_000) // 200 / 4
    expect(out.eurCentsById.get('sek-g')).toBe(2_000) // 200 / 10
    expect(out.uncoveredCentsById.size).toBe(0)
  })

  it('gastar de más en una divisa no se cubre con el saldo de otra', () => {
    const out = convertPocketSpendFifo([
      credit('pln-c', 'acc-pln', 'PLN', 20_000, '2026-08-01', '4.0'),
      credit('sek-c', 'acc-sek', 'SEK', 20_000, '2026-08-01', '10.0'),
      // Se pasa 50 SEK: el pocket de zlotys tiene de sobra, pero no es suyo.
      spend('sek-g', 'acc-sek', 'SEK', 25_000, '2026-08-02'),
    ])
    expect(out.eurCentsById.get('sek-g')).toBe(2_000)
    expect(out.uncoveredCentsById.get('sek-g')).toBe(5_000)
    // El pocket de zlotys sigue intacto.
    expect(out.uncoveredCentsById.has('pln-c')).toBe(false)
  })

  it('tres divisas, una de ellas estrenada después, siguen sin tocar código', () => {
    const out = convertPocketSpendFifo([
      credit('pln-c', 'acc-pln', 'PLN', 10_000, '2026-08-01', '4.0'),
      credit('sek-c', 'acc-sek', 'SEK', 10_000, '2026-08-01', '10.0'),
      credit('usd-c', 'acc-usd', 'USD', 10_000, '2026-11-01', '1.25'),
      spend('pln-g', 'acc-pln', 'PLN', 10_000, '2026-08-05'),
      spend('sek-g', 'acc-sek', 'SEK', 10_000, '2026-08-05'),
      spend('usd-g', 'acc-usd', 'USD', 10_000, '2026-11-05'),
    ])
    expect(out.eurCentsById.get('pln-g')).toBe(2_500)
    expect(out.eurCentsById.get('sek-g')).toBe(1_000)
    expect(out.eurCentsById.get('usd-g')).toBe(8_000)
  })

  it('dos pockets de la MISMA divisa tampoco se mezclan', () => {
    const out = convertPocketSpendFifo([
      credit('a-c', 'acc-a', 'PLN', 10_000, '2026-08-01', '4.0'),
      credit('b-c', 'acc-b', 'PLN', 10_000, '2026-08-01', '5.0'),
      spend('a-g', 'acc-a', 'PLN', 10_000, '2026-08-02'),
      spend('b-g', 'acc-b', 'PLN', 10_000, '2026-08-02'),
    ])
    expect(out.eurCentsById.get('a-g')).toBe(2_500)
    expect(out.eurCentsById.get('b-g')).toBe(2_000)
  })

  // Lo que no se puede respaldar ------------------------------------------------

  it('un pocket con saldo anterior a los datos deja el gasto sin convertir', () => {
    // El caso real de la libra: un gasto y ningún cambio detrás.
    const out = convertPocketSpendFifo([spend('gbp-g', 'acc-gbp', 'GBP', 999, '2026-06-07')])
    expect(out.eurCentsById.has('gbp-g')).toBe(false)
    expect(out.uncoveredCentsById.get('gbp-g')).toBe(999)
  })

  it('un gasto medio cubierto reparte: lo respaldado en euros y el resto sin convertir', () => {
    const out = convertPocketSpendFifo([
      credit('c1', 'pln', 'PLN', 4_000, '2026-08-01', '4.0'),
      spend('g1', 'pln', 'PLN', 10_000, '2026-08-02'),
    ])
    expect(out.eurCentsById.get('g1')).toBe(1_000) // 40 zł respaldados
    expect(out.uncoveredCentsById.get('g1')).toBe(6_000) // 60 zł sin respaldo
  })

  it('un abono sin cambio detrás (una recarga) no inventa tasa', () => {
    const out = convertPocketSpendFifo([
      credit('topup', 'pln', 'PLN', 10_000, '2026-08-01', null),
      spend('g1', 'pln', 'PLN', 4_000, '2026-08-02'),
    ])
    expect(out.eurCentsById.has('g1')).toBe(false)
    expect(out.uncoveredCentsById.get('g1')).toBe(4_000)
  })

  it('una tasa cotizada en otra base no se usa: dividir daría un número plausible y falso', () => {
    const out = convertPocketSpendFifo([
      { id: 'c1', accountId: 'pln', currency: 'PLN', amountCents: 10_000, dateISO: '2026-08-01', exchangeRate: '0.25', exchangeRateUnitCurrency: 'PLN' },
      spend('g1', 'pln', 'PLN', 4_000, '2026-08-02'),
    ])
    expect(out.eurCentsById.has('g1')).toBe(false)
    expect(out.uncoveredCentsById.get('g1')).toBe(4_000)
  })

  // Los datos reales de agosto -------------------------------------------------

  it('reproduce el agosto polaco real: 1.196,74 zł son 279,24 €', () => {
    const movements: PocketMovement[] = [
      credit('e1', 'pln', 'PLN', 85_681, '2026-08-14', '4.2840866671692154'),
      spend('t1', 'pln', 'PLN', 1_200, '2026-08-14'),
      spend('t2', 'pln', 'PLN', 1_800, '2026-08-14'),
      spend('t3', 'pln', 'PLN', 1_800, '2026-08-14'),
      spend('t4', 'pln', 'PLN', 27_036, '2026-08-14'),
      spend('t5', 'pln', 'PLN', 38_322, '2026-08-14'),
      credit('e2', 'pln', 'PLN', 20_000, '2026-08-15', '4.2894237149666891'),
      credit('e3', 'pln', 'PLN', 4_247, '2026-08-15', '4.2902845000507398'),
      spend('t6', 'pln', 'PLN', 1_400, '2026-08-15'),
      spend('t7', 'pln', 'PLN', 1_780, '2026-08-15'),
      spend('t8', 'pln', 'PLN', 3_200, '2026-08-15'),
      spend('t9', 'pln', 'PLN', 12_500, '2026-08-15'),
      spend('t10', 'pln', 'PLN', 19_360, '2026-08-15'),
      credit('e4', 'pln', 'PLN', 10_000, '2026-08-16', '4.2894237149666891'),
      spend('t11', 'pln', 'PLN', 699, '2026-08-16'),
      spend('t12', 'pln', 'PLN', 1_200, '2026-08-16'),
      spend('t13', 'pln', 'PLN', 999, '2026-08-17'),
      spend('t14', 'pln', 'PLN', 8_378, '2026-08-17'),
    ]
    const out = convertPocketSpendFifo(movements)
    const total = [...out.eurCentsById.values()].reduce((a, b) => a + b, 0)
    expect(total).toBe(27_924) // 279,24 €
    expect(out.uncoveredCentsById.size).toBe(0)
    // Sushipak partido entre dos lotes: 166,43 zł a 4,2894 + 27,17 zł a 4,2903.
    expect(out.eurCentsById.get('t10')).toBe(4_513)
  })
})
