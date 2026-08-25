import { describe, expect, it, vi } from 'vitest'

/**
 * Query builder falso genérico: cada método de encadenado se devuelve a sí
 * mismo; `insert`/`upsert` registran lo que se les pasó; `.single()` y
 * `.maybeSingle()` resuelven según la tabla y el estado simulado.
 */
function makeSupabaseMock({
  existingManualConnection = null as { id: string } | null,
  existingBalanceCents = null as number | null,
  failInsertTable = null as string | null,
}: {
  existingManualConnection?: { id: string } | null
  existingBalanceCents?: number | null
  failInsertTable?: string | null
} = {}) {
  const inserted: Record<string, unknown[]> = { bank_connections: [], accounts: [], transactions: [], balances: [] }

  function chainable(table: string) {
    const builder: Record<string, unknown> = {}
    for (const method of ['select', 'eq', 'order', 'in', 'limit']) {
      builder[method] = () => builder
    }
    builder.maybeSingle = () => {
      if (table === 'bank_connections') return Promise.resolve({ data: existingManualConnection, error: null })
      if (table === 'balances') return Promise.resolve({ data: existingBalanceCents === null ? null : { amount_cents: existingBalanceCents }, error: null })
      return Promise.resolve({ data: null, error: null })
    }
    builder.insert = (payload: unknown) => {
      inserted[table]?.push(payload)
      return {
        select: () => ({
          single: () =>
            failInsertTable === table
              ? Promise.resolve({ data: null, error: { message: 'boom' } })
              : Promise.resolve({ data: { id: `${table}-new-id` }, error: null }),
        }),
      }
    }
    builder.upsert = (payload: unknown) => {
      inserted[table]?.push(payload)
      return failInsertTable === table ? Promise.resolve({ error: { message: 'boom' } }) : Promise.resolve({ error: null })
    }
    return builder
  }

  const mockFrom = vi.fn((table: string) => chainable(table))
  return {
    mockFrom,
    inserted,
    supabaseMock: {
      from: mockFrom,
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: vi.fn(),
      },
    },
  }
}

describe('createManualAccount', () => {
  it('crea la conexión manual, la cuenta, el movimiento de saldo inicial y el saldo', async () => {
    vi.resetModules()
    const { supabaseMock, inserted } = makeSupabaseMock({ existingManualConnection: null })
    vi.doMock('../../lib/supabase/client', () => ({ isSupabaseConfigured: true, supabase: supabaseMock }))
    const { createManualAccount } = await import('./useManualEntries')

    const error = await createManualAccount('Efectivo', 'Activo manual', 5000)
    expect(error).toBeNull()
    expect(inserted.bank_connections).toHaveLength(1)
    expect(inserted.accounts).toEqual([expect.objectContaining({ name: 'Efectivo', account_function: 'activo_manual', currency: 'EUR' })])
    expect(inserted.transactions).toEqual([
      expect.objectContaining({ amount_cents: 5000, credit_debit: 'CRDT', description: 'Saldo inicial' }),
    ])
    expect(inserted.balances).toEqual([expect.objectContaining({ amount_cents: 5000, balance_type: 'MANUAL' })])
  })

  it('reutiliza la conexión manual si ya existe, en vez de crear otra', async () => {
    vi.resetModules()
    const { supabaseMock, inserted } = makeSupabaseMock({ existingManualConnection: { id: 'conn-existing' } })
    vi.doMock('../../lib/supabase/client', () => ({ isSupabaseConfigured: true, supabase: supabaseMock }))
    const { createManualAccount } = await import('./useManualEntries')

    await createManualAccount('Hucha', 'Ahorro', 10000)
    expect(inserted.bank_connections).toHaveLength(0)
    expect(inserted.accounts).toEqual([expect.objectContaining({ connection_id: 'conn-existing' })])
  })

  it('un saldo inicial negativo se registra como DBIT', async () => {
    vi.resetModules()
    const { supabaseMock, inserted } = makeSupabaseMock({ existingManualConnection: { id: 'conn-existing' } })
    vi.doMock('../../lib/supabase/client', () => ({ isSupabaseConfigured: true, supabase: supabaseMock }))
    const { createManualAccount } = await import('./useManualEntries')

    await createManualAccount('Préstamo a un amigo', 'Deuda', -20000)
    expect(inserted.transactions[0]).toEqual(expect.objectContaining({ amount_cents: -20000, credit_debit: 'DBIT' }))
  })

  it('sin nombre, no llega a llamar a Supabase', async () => {
    vi.resetModules()
    const { supabaseMock, mockFrom } = makeSupabaseMock()
    vi.doMock('../../lib/supabase/client', () => ({ isSupabaseConfigured: true, supabase: supabaseMock }))
    const { createManualAccount } = await import('./useManualEntries')

    const error = await createManualAccount('   ', 'Activo manual', 0)
    expect(error).toBe('Ponle un nombre a la cuenta.')
    expect(mockFrom).not.toHaveBeenCalled()
  })
})

describe('addManualTransaction', () => {
  it('suma el importe al saldo ya existente de la cuenta', async () => {
    vi.resetModules()
    const { supabaseMock, inserted } = makeSupabaseMock({ existingBalanceCents: 5000 })
    vi.doMock('../../lib/supabase/client', () => ({ isSupabaseConfigured: true, supabase: supabaseMock }))
    const { addManualTransaction } = await import('./useManualEntries')

    const error = await addManualTransaction('acc-1', 'Mercadona', -3200, '2026-08-25', null)
    expect(error).toBeNull()
    expect(inserted.transactions).toEqual([
      expect.objectContaining({ account_id: 'acc-1', amount_cents: -3200, credit_debit: 'DBIT', description: 'Mercadona' }),
    ])
    expect(inserted.balances).toEqual([expect.objectContaining({ account_id: 'acc-1', amount_cents: 1800 })])
  })

  it('sin saldo previo, parte de 0', async () => {
    vi.resetModules()
    const { supabaseMock, inserted } = makeSupabaseMock({ existingBalanceCents: null })
    vi.doMock('../../lib/supabase/client', () => ({ isSupabaseConfigured: true, supabase: supabaseMock }))
    const { addManualTransaction } = await import('./useManualEntries')

    await addManualTransaction('acc-1', 'Ingreso', 10000, '2026-08-25', null)
    expect(inserted.balances[0]).toEqual(expect.objectContaining({ amount_cents: 10000 }))
  })

  it('rechaza un importe de 0', async () => {
    vi.resetModules()
    const { supabaseMock, mockFrom } = makeSupabaseMock()
    vi.doMock('../../lib/supabase/client', () => ({ isSupabaseConfigured: true, supabase: supabaseMock }))
    const { addManualTransaction } = await import('./useManualEntries')

    const error = await addManualTransaction('acc-1', 'Nada', 0, '2026-08-25', null)
    expect(error).toBe('El importe no puede ser 0.')
    expect(mockFrom).not.toHaveBeenCalled()
  })
})
