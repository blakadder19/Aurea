import { describe, expect, it } from 'vitest'
import { latestSync, type RealConnection } from './useRealConnections'

function connection(overrides: Partial<RealConnection>): RealConnection {
  return {
    id: 'conn-1',
    institution: 'Revolut',
    country: 'ES',
    status: 'connected',
    connectedAt: '2026-08-01T10:00:00Z',
    lastSyncedAt: null,
    provider: 'enable_banking',
    ...overrides,
  }
}

describe('latestSync', () => {
  it('devuelve null cuando ninguna conexión se ha sincronizado nunca', () => {
    expect(latestSync([connection({ lastSyncedAt: null })])).toBeNull()
  })

  it('devuelve la fecha de sincronización más reciente entre varias conexiones', () => {
    const result = latestSync([
      connection({ id: 'a', lastSyncedAt: '2026-08-20T08:00:00Z' }),
      connection({ id: 'b', lastSyncedAt: '2026-08-25T13:48:00Z' }),
      connection({ id: 'c', lastSyncedAt: null }),
    ])
    expect(result).toBe('2026-08-25T13:48:00Z')
  })
})
