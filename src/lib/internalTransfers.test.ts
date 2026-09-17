import { describe, expect, it } from 'vitest'
import { detectInternalTransferCandidates, type TransferTxLike } from './internalTransfers'

function tx(overrides: Partial<TransferTxLike> & { id: string; amountCents: number }): TransferTxLike {
  return {
    accountId: 'acc-1',
    dateISO: '2026-07-10',
    description: '',
    currency: 'EUR',
    transactionCode: null,
    exchangeRate: null,
    instructedAmountCents: null,
    ...overrides,
  }
}

const OWN_ACCOUNTS = ['Alejandro López', 'ALEJANDRO LOPEZ MOLINA & ELISABET MARTINEZ IBANEZ']

describe('detectInternalTransferCandidates', () => {
  it('sin movimientos, no propone nada', () => {
    expect(detectInternalTransferCandidates([])).toEqual([])
  })

  it('empareja un cargo y un abono del mismo importe en cuentas distintas', () => {
    const candidates = detectInternalTransferCandidates([
      tx({ id: 'out', accountId: 'acc-1', amountCents: -85000 }),
      tx({ id: 'in', accountId: 'acc-2', amountCents: 85000 }),
    ])
    expect(candidates).toHaveLength(1)
    expect(candidates[0].outgoing.id).toBe('out')
    expect(candidates[0].incoming.id).toBe('in')
  })

  it('no empareja movimientos de la misma cuenta (no es un traspaso, es otra cosa)', () => {
    const candidates = detectInternalTransferCandidates([
      tx({ id: 'out', accountId: 'acc-1', amountCents: -5000 }),
      tx({ id: 'in', accountId: 'acc-1', amountCents: 5000 }),
    ])
    expect(candidates).toEqual([])
  })

  it('no empareja importes distintos', () => {
    const candidates = detectInternalTransferCandidates([
      tx({ id: 'out', accountId: 'acc-1', amountCents: -5000 }),
      tx({ id: 'in', accountId: 'acc-2', amountCents: 4900 }),
    ])
    expect(candidates).toEqual([])
  })

  it('no empareja si pasan más de 3 días entre los dos lados', () => {
    const candidates = detectInternalTransferCandidates([
      tx({ id: 'out', accountId: 'acc-1', amountCents: -5000, dateISO: '2026-07-10' }),
      tx({ id: 'in', accountId: 'acc-2', amountCents: 5000, dateISO: '2026-07-14' }),
    ])
    expect(candidates).toEqual([])
  })

  it('sí empareja dentro de la ventana de 3 días (un traspaso puede tardar en aparecer)', () => {
    const candidates = detectInternalTransferCandidates([
      tx({ id: 'out', accountId: 'acc-1', amountCents: -5000, dateISO: '2026-07-10' }),
      tx({ id: 'in', accountId: 'acc-2', amountCents: 5000, dateISO: '2026-07-13' }),
    ])
    expect(candidates).toHaveLength(1)
  })

  it('marca confianza alta cuando ambas descripciones son idénticas (cambio de divisa)', () => {
    const candidates = detectInternalTransferCandidates([
      tx({ id: 'out', accountId: 'acc-1', amountCents: -20000, description: 'Exchanged to PLN' }),
      tx({ id: 'in', accountId: 'acc-2', amountCents: 20000, description: 'Exchanged to PLN' }),
    ])
    expect(candidates[0].confidence).toBe('alta')
  })

  it('marca confianza alta cuando la descripción nombra una cuenta tuya', () => {
    const candidates = detectInternalTransferCandidates(
      [
        tx({ id: 'out', accountId: 'acc-1', amountCents: -85000, description: 'To ALEJANDRO LOPEZ MOLINA & ELISABET MARTINEZ IBANEZ' }),
        tx({ id: 'in', accountId: 'acc-2', amountCents: 85000, description: 'From Alejandro L' }),
      ],
      OWN_ACCOUNTS,
    )
    expect(candidates[0].confidence).toBe('alta')
  })

  it('un reembolso de un tercero solo llega a confianza media, nunca se da por hecho', () => {
    // Caso real: una cena de 12 € que un amigo te devuelve al día siguiente.
    // Cuadra en importe y fecha, pero marcarlo como traspaso borraría el gasto.
    const candidates = detectInternalTransferCandidates(
      [
        tx({ id: 'cena', accountId: 'acc-1', amountCents: -1200, description: 'Emcek Bistro', dateISO: '2026-08-16' }),
        tx({ id: 'devolucion', accountId: 'acc-2', amountCents: 1200, description: 'From Arun B', dateISO: '2026-08-15' }),
      ],
      OWN_ACCOUNTS,
    )
    expect(candidates).toHaveLength(1)
    expect(candidates[0].confidence).toBe('media')
  })

  // Lo que dice el banco -------------------------------------------------------

  it('no empareja divisas distintas aunque la cifra coincida (el falso 200 EUR / 200 PLN)', () => {
    // Caso real del 14 y 15 de agosto: un cargo de 200,00 € y un abono de
    // 200,00 zł, de dos cambios DISTINTOS, que el detector daba por pareja
    // porque solo miraba `amountCents`. Se llegó a confirmar en la base.
    const candidates = detectInternalTransferCandidates([
      tx({ id: 'eur', accountId: 'acc-eur', amountCents: -20000, currency: 'EUR', dateISO: '2026-08-14', description: 'Exchanged to PLN' }),
      tx({ id: 'pln', accountId: 'acc-pln', amountCents: 20000, currency: 'PLN', dateISO: '2026-08-15', description: 'Exchanged to PLN' }),
    ])
    expect(candidates).toEqual([])
  })

  it('empareja las dos patas de un cambio por la tasa, aunque los importes no coincidan', () => {
    // −47,10 € y +200,00 zł: la misma operación, misma tasa, cifras distintas.
    const candidates = detectInternalTransferCandidates([
      tx({
        id: 'eur',
        accountId: 'acc-eur',
        amountCents: -4710,
        instructedAmountCents: -4663,
        currency: 'EUR',
        dateISO: '2026-08-15',
        transactionCode: 'EXCHANGE',
        exchangeRate: '4.2894237149666891',
        description: 'Exchanged to PLN',
      }),
      tx({
        id: 'pln',
        accountId: 'acc-pln',
        amountCents: 20000,
        instructedAmountCents: 20000,
        currency: 'PLN',
        dateISO: '2026-08-15',
        transactionCode: 'EXCHANGE',
        exchangeRate: '4.2894237149666891',
        description: 'Exchanged to PLN',
      }),
    ])
    expect(candidates).toHaveLength(1)
    expect(candidates[0].outgoing.id).toBe('eur')
    expect(candidates[0].incoming.id).toBe('pln')
    expect(candidates[0].confidence).toBe('alta')
  })

  it('con la misma tasa repetida el mismo día, cada pata va con la que le cuadra', () => {
    // Revolut reutiliza la tasa: cuatro patas, dos parejas. Si bastara con
    // compartir tasa, se cruzarían.
    const rate = '4.2894237149666891'
    const exchange = (id: string, accountId: string, amountCents: number, currency: string, dateISO: string) =>
      tx({ id, accountId, amountCents, instructedAmountCents: amountCents, currency, dateISO, transactionCode: 'EXCHANGE', exchangeRate: rate, description: 'Exchanged to PLN' })

    const candidates = detectInternalTransferCandidates([
      exchange('eur-23', 'acc-eur', -2332, 'EUR', '2026-08-16'),
      exchange('pln-100', 'acc-pln', 10000, 'PLN', '2026-08-16'),
      exchange('eur-47', 'acc-eur', -4663, 'EUR', '2026-08-15'),
      exchange('pln-200', 'acc-pln', 20000, 'PLN', '2026-08-15'),
    ])

    expect(candidates).toHaveLength(2)
    const pairs = candidates.map((c) => `${c.outgoing.id}/${c.incoming.id}`).sort()
    expect(pairs).toEqual(['eur-23/pln-100', 'eur-47/pln-200'])
  })

  it('no empareja dos cambios de tasas distintas aunque sean de días contiguos', () => {
    const candidates = detectInternalTransferCandidates([
      tx({ id: 'eur', accountId: 'acc-eur', amountCents: -20000, currency: 'EUR', dateISO: '2026-08-14', transactionCode: 'EXCHANGE', exchangeRate: '4.2840866671692154', description: 'Exchanged to PLN' }),
      tx({ id: 'pln', accountId: 'acc-pln', amountCents: 20000, currency: 'PLN', dateISO: '2026-08-15', transactionCode: 'EXCHANGE', exchangeRate: '4.2894237149666891', description: 'Exchanged to PLN' }),
    ])
    expect(candidates).toEqual([])
  })

  it('un TRANSFER marcado por el banco es confianza alta sin depender del texto', () => {
    const candidates = detectInternalTransferCandidates([
      tx({ id: 'out', accountId: 'acc-1', amountCents: -85000, transactionCode: 'TRANSFER', description: 'Movimiento' }),
      tx({ id: 'in', accountId: 'acc-2', amountCents: 85000, transactionCode: 'TRANSFER', description: 'Otra cosa' }),
    ])
    expect(candidates).toHaveLength(1)
    expect(candidates[0].confidence).toBe('alta')
  })

  it('verifiedByBank distingue lo que confirma el banco de lo que solo se parece', () => {
    const [cambio] = detectInternalTransferCandidates([
      tx({ id: 'eur', accountId: 'acc-eur', amountCents: -4663, currency: 'EUR', dateISO: '2026-08-15', transactionCode: 'EXCHANGE', exchangeRate: '4.2894237149666891', description: 'Exchanged to PLN' }),
      tx({ id: 'pln', accountId: 'acc-pln', amountCents: 20000, currency: 'PLN', dateISO: '2026-08-15', transactionCode: 'EXCHANGE', exchangeRate: '4.2894237149666891', description: 'Exchanged to PLN' }),
    ])
    expect(cambio.verifiedByBank).toBe(true)

    // Mismo texto a los dos lados y misma cifra, pero nada del banco detrás:
    // es exactamente la señal que confirmó tres parejas mal en agosto.
    const [soloTexto] = detectInternalTransferCandidates([
      tx({ id: 'out', accountId: 'acc-1', amountCents: -20000, description: 'Exchanged to PLN' }),
      tx({ id: 'in', accountId: 'acc-2', amountCents: 20000, description: 'Exchanged to PLN' }),
    ])
    expect(soloTexto.confidence).toBe('alta')
    expect(soloTexto.verifiedByBank).toBe(false)
  })

  it('dos EXCHANGE de la misma divisa que solo cuadran en cifra no cuentan como verificados', () => {
    // Sin tasa compartida no hay confirmación independiente: que ambos sean
    // EXCHANGE no basta, podrían ser dos cambios distintos del mismo importe.
    const [pareja] = detectInternalTransferCandidates([
      tx({ id: 'out', accountId: 'acc-1', amountCents: -5000, currency: 'EUR', transactionCode: 'EXCHANGE', exchangeRate: '1.0842' }),
      tx({ id: 'in', accountId: 'acc-2', amountCents: 5000, currency: 'EUR', transactionCode: 'EXCHANGE', exchangeRate: '7.7031' }),
    ])
    expect(pareja.verifiedByBank).toBe(false)
  })

  it('una pareja respaldada por el banco se lleva el lado antes que una coincidencia de texto', () => {
    const candidates = detectInternalTransferCandidates(
      [
        tx({ id: 'out', accountId: 'acc-1', amountCents: -85000, transactionCode: 'TRANSFER', description: 'To ALEJANDRO LOPEZ MOLINA & ELISABET MARTINEZ IBANEZ' }),
        tx({ id: 'in-texto', accountId: 'acc-2', amountCents: 85000, description: 'To ALEJANDRO LOPEZ MOLINA & ELISABET MARTINEZ IBANEZ' }),
        tx({ id: 'in-banco', accountId: 'acc-3', amountCents: 85000, transactionCode: 'TRANSFER', description: 'From Alejandro L' }),
      ],
      OWN_ACCOUNTS,
    )
    expect(candidates).toHaveLength(1)
    expect(candidates[0].incoming.id).toBe('in-banco')
  })

  it('cada movimiento entra como mucho en una pareja, y gana la de más confianza', () => {
    // Mismo importe el mismo día con dos candidatos: uno respaldado por el
    // nombre de una cuenta propia y otro no. El bueno se queda el cargo.
    const candidates = detectInternalTransferCandidates(
      [
        tx({ id: 'out', accountId: 'acc-1', amountCents: -79800, description: 'To ALEJANDRO LOPEZ MOLINA & ELISABET MARTINEZ IBANEZ' }),
        tx({ id: 'in-tercero', accountId: 'acc-2', amountCents: 79800, description: 'From Elisabet M' }),
        tx({ id: 'in-propio', accountId: 'acc-3', amountCents: 79800, description: 'From Alejandro L' }),
      ],
      ['Alejandro López'],
    )
    expect(candidates).toHaveLength(1)
    expect(candidates[0].incoming.id).toBe('in-propio')
    expect(candidates[0].confidence).toBe('alta')
  })
})
