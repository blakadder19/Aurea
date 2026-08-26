import { describe, expect, it, vi } from 'vitest'

function chainable(data: unknown[] | null, error: unknown = null) {
  const builder: Record<string, unknown> = {}
  for (const method of ['select', 'order', 'insert', 'update', 'eq']) {
    builder[method] = () => builder
  }
  // oxlint-disable-next-line unicorn/no-thenable -- imita a propósito el query builder real de supabase-js.
  builder.then = (resolve: (v: { data: unknown[] | null; error: unknown }) => unknown) => Promise.resolve(resolve({ data, error }))
  return builder
}

describe('fetchActiveDeclaredIncomeCents', () => {
  it('suma solo los ingresos activos, ignora los desactivados', async () => {
    vi.resetModules()
    const rows = [
      { id: 'i1', name: 'Sueldo efectivo', amount_cents: 150000, active: true },
      { id: 'i2', name: 'Alquiler viejo', amount_cents: 50000, active: false },
    ]
    vi.doMock('./supabase/client', () => ({
      isSupabaseConfigured: true,
      supabase: { from: () => chainable(rows), auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }), onAuthStateChange: vi.fn() } },
    }))
    const { fetchActiveDeclaredIncomeCents } = await import('./declaredIncome')

    expect(await fetchActiveDeclaredIncomeCents()).toBe(150000)
  })

  it('sin Supabase configurado, devuelve 0 sin reventar', async () => {
    vi.resetModules()
    vi.doMock('./supabase/client', () => ({ isSupabaseConfigured: false, supabase: null }))
    const { fetchActiveDeclaredIncomeCents } = await import('./declaredIncome')

    expect(await fetchActiveDeclaredIncomeCents()).toBe(0)
  })
})

describe('createDeclaredIncome', () => {
  it('rechaza un nombre vacío', async () => {
    vi.resetModules()
    vi.doMock('./supabase/client', () => ({ isSupabaseConfigured: true, supabase: { from: () => chainable([]), auth: { getUser: vi.fn(), getSession: vi.fn().mockResolvedValue({ data: { session: null } }), onAuthStateChange: vi.fn() } } }))
    const { createDeclaredIncome } = await import('./declaredIncome')

    expect(await createDeclaredIncome('  ', 1000)).toBe('Ponle un nombre al ingreso.')
  })

  it('rechaza un importe que no sea mayor que 0', async () => {
    vi.resetModules()
    vi.doMock('./supabase/client', () => ({ isSupabaseConfigured: true, supabase: { from: () => chainable([]), auth: { getUser: vi.fn(), getSession: vi.fn().mockResolvedValue({ data: { session: null } }), onAuthStateChange: vi.fn() } } }))
    const { createDeclaredIncome } = await import('./declaredIncome')

    expect(await createDeclaredIncome('Sueldo', 0)).toBe('El importe debe ser mayor que 0.')
    expect(await createDeclaredIncome('Sueldo', -500)).toBe('El importe debe ser mayor que 0.')
  })

  it('con sesión y datos válidos, inserta y no devuelve error', async () => {
    vi.resetModules()
    const mockFrom = vi.fn(() => chainable([]))
    vi.doMock('./supabase/client', () => ({
      isSupabaseConfigured: true,
      supabase: {
        from: mockFrom,
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
          getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
          onAuthStateChange: vi.fn(),
        },
      },
    }))
    const { createDeclaredIncome } = await import('./declaredIncome')

    const error = await createDeclaredIncome('Sueldo efectivo', 150000)
    expect(error).toBeNull()
    expect(mockFrom).toHaveBeenCalledWith('declared_incomes')
  })
})
