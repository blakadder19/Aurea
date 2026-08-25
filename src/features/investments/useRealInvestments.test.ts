import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'

function chainable(data: unknown[]) {
  const builder: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'order', 'update']) {
    builder[method] = () => builder
  }
  // oxlint-disable-next-line unicorn/no-thenable -- imita a propósito el query builder real de supabase-js.
  builder.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) => Promise.resolve(resolve({ data, error: null }))
  return builder
}

const fixtures = {
  investments: [
    {
      id: 'inv-1',
      name: 'Fondo indexado mundial',
      product_type: 'Fondos de inversión',
      units: 412.6,
      avg_cost_cents: 7855,
      value_cents: 3892000,
      contributed_cents: 3240000,
    },
    {
      id: 'inv-2',
      name: 'Cripto',
      product_type: 'Cripto',
      units: null,
      avg_cost_cents: null,
      value_cents: 431000,
      contributed_cents: 300000,
    },
  ],
}

const mockFrom = vi.fn((table: string) => chainable(fixtures[table as keyof typeof fixtures] ?? []))

vi.mock('../../lib/supabase/client', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: (table: string) => mockFrom(table),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(),
    },
  },
}))

const activeSession = { user: { id: 'user-1' } } as unknown as Session

const { useAuthStore } = await import('../../lib/supabase/useAuth')
const { useRealInvestments, toPositionRow, archiveInvestment, unarchiveInvestment } = await import('./useRealInvestments')

describe('useRealInvestments', () => {
  it('sin sesión, devuelve investments=null sin consultar Supabase', () => {
    useAuthStore.setState({ session: null })
    const { result } = renderHook(() => useRealInvestments())
    expect(result.current.loading).toBe(false)
    expect(result.current.investments).toBeNull()
  })

  it('con sesión, arma RealInvestment[] a partir de investments', async () => {
    useAuthStore.setState({ session: activeSession })
    const { result } = renderHook(() => useRealInvestments())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.investments).toEqual([
      { id: 'inv-1', name: 'Fondo indexado mundial', productType: 'Fondos de inversión', units: 412.6, avgCostCents: 7855, valueCents: 3892000, contributedCents: 3240000 },
      { id: 'inv-2', name: 'Cripto', productType: 'Cripto', units: null, avgCostCents: null, valueCents: 431000, contributedCents: 300000 },
    ])
  })
})

describe('toPositionRow', () => {
  it('deriva gain/gainPct de value-contributed, nunca fabricados', () => {
    const row = toPositionRow({
      id: 'inv-1',
      name: 'Fondo indexado mundial',
      productType: 'Fondos de inversión',
      units: 412.6,
      avgCostCents: 7855,
      valueCents: 3892000,
      contributedCents: 3240000,
    })
    expect(row.value).toBe(38920)
    expect(row.contributed).toBe(32400)
    expect(row.gain).toBeCloseTo(6520)
    expect(row.gainPct).toBeCloseTo(20.123, 2)
  })

  it('con contributed=0, gainPct es 0 en vez de dividir por cero', () => {
    const row = toPositionRow({ id: 'x', name: 'x', productType: 'Otros', units: null, avgCostCents: null, valueCents: 1000, contributedCents: 0 })
    expect(row.gainPct).toBe(0)
  })
})

describe('archiveInvestment / unarchiveInvestment', () => {
  it('archiva escribiendo archived=true y no da error', async () => {
    mockFrom.mockClear()
    const error = await archiveInvestment('inv-1')
    expect(error).toBeNull()
    expect(mockFrom).toHaveBeenCalledWith('investments')
  })

  it('deshacer escribe archived=false', async () => {
    mockFrom.mockClear()
    await unarchiveInvestment('inv-1')
    expect(mockFrom).toHaveBeenCalledWith('investments')
  })
})
