import { describe, expect, it } from 'vitest'
import { detectInternalTransferCandidates, type TransferTxLike } from './internalTransfers'

function tx(overrides: Partial<TransferTxLike> & { id: string; amountCents: number }): TransferTxLike {
  return { accountId: 'acc-1', dateISO: '2026-07-10', description: '', ...overrides }
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
