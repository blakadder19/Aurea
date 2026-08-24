import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import type { Account } from '../../data/accounts'

function chainable(data: unknown[]) {
  const builder: Record<string, unknown> = {}
  for (const method of ['select', 'in']) {
    builder[method] = () => builder
  }
  // oxlint-disable-next-line unicorn/no-thenable -- imita a propósito el query builder real de supabase-js.
  builder.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) => Promise.resolve(resolve({ data, error: null }))
  return builder
}

const fixtures = {
  debt_details: [{ account_id: 'acc-hipoteca', annual_rate_bps: 285, monthly_payment_cents: 61240, next_payment_date: '2026-09-01' }],
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

const accounts: Account[] = [
  { id: 'acc-hipoteca', name: 'Hipoteca', institution: 'Bankinter', fn: 'Deuda', balance: -148320, countsInAvailableToday: false, recentMovements: [] },
  { id: 'acc-nomina', name: 'Nómina', institution: 'Openbank', fn: 'Para gastar', balance: 4238.64, countsInAvailableToday: true, recentMovements: [] },
]

const { useAuthStore } = await import('../../lib/supabase/useAuth')
const { useRealDebts } = await import('./useRealDebts')

describe('useRealDebts', () => {
  it('sin sesión, devuelve debts=null sin consultar Supabase', () => {
    useAuthStore.setState({ session: null })
    const { result } = renderHook(() => useRealDebts(accounts))
    expect(result.current.loading).toBe(false)
    expect(result.current.debts).toBeNull()
  })

  it('con sesión, solo incluye cuentas con función Deuda, saldo en positivo y detalle cruzado', async () => {
    useAuthStore.setState({ session: activeSession })
    const { result } = renderHook(() => useRealDebts(accounts))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.debts).toEqual([
      {
        accountId: 'acc-hipoteca',
        name: 'Hipoteca',
        institution: 'Bankinter',
        balanceCents: 14832000,
        annualRateBps: 285,
        monthlyPaymentCents: 61240,
        nextPaymentDate: '2026-09-01',
      },
    ])
  })
})
