import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'

/**
 * El Centro de revisión razona sobre lo que hay cargado y da su respuesta por
 * completa: cuenta lo pendiente y empareja traspasos. Con la primera página de
 * 300 y 664 movimientos, las dos cosas mienten — los cuatro cambios de divisa
 * del 14-16 de agosto caen en la posición 303 y el detector no los veía.
 *
 * Misma solución que el buscador: en cuanto la vista lo necesita, se trae el
 * histórico entero.
 *
 * Este test usa el hook REAL contra un supabase falso que respeta `.limit()`,
 * y comprueba que la pareja del fondo llega a la tarjeta. La primera versión
 * mockeaba `useRealTransactions` y solo miraba que se llamara a `loadAll()`:
 * pasaba en verde con la app rota, porque comprobaba el mock y no el
 * recorrido. Si se vuelve a tocar esto, que siga entrando por el hook real.
 */

const TOTAL = 664
const DEEP_INDEX = 400 // muy por debajo del corte de 300

function fillerRow(i: number) {
  return {
    id: `tx-${i}`,
    account_id: 'acc-1',
    booking_date: '2026-09-10',
    value_date: null,
    description: `Mov ${i}`,
    amount_cents: -100 - i,
    currency: 'EUR',
    transaction_code: 'CARD_PAYMENT',
    exchange_rate: null,
    instructed_amount_cents: null,
    category_id: 'cat-1',
    needs_review: false,
    user_note: null,
    tags: [],
    display_name: null,
    is_internal_transfer: false,
    receipt_path: null,
    income_type: null,
    is_reimbursement: false,
    is_balance_adjustment: false,
  }
}

/** Las dos patas reales del cambio del 15 de agosto: −46,63 € y +200,00 zł, misma tasa. */
const EXCHANGE_LEGS = [
  {
    ...fillerRow(DEEP_INDEX),
    id: 'cambio-eur',
    account_id: 'acc-eur',
    booking_date: '2026-08-15',
    description: 'Exchanged to PLN',
    amount_cents: -4663,
    currency: 'EUR',
    transaction_code: 'EXCHANGE',
    exchange_rate: '4.2894237149666891',
    instructed_amount_cents: -4663,
  },
  {
    ...fillerRow(DEEP_INDEX + 1),
    id: 'cambio-pln',
    account_id: 'acc-pln',
    booking_date: '2026-08-15',
    description: 'Exchanged to PLN',
    amount_cents: 20000,
    currency: 'PLN',
    transaction_code: 'EXCHANGE',
    exchange_rate: '4.2894237149666891',
    instructed_amount_cents: 20000,
  },
]

const allTx = [
  ...Array.from({ length: DEEP_INDEX }, (_, i) => fillerRow(i)),
  ...EXCHANGE_LEGS,
  ...Array.from({ length: TOTAL - DEEP_INDEX - 2 }, (_, i) => fillerRow(DEEP_INDEX + 2 + i)),
]

const limitsSeen: number[] = []

/** Query builder falso que sí respeta `.limit()` — es justo lo que se está probando. */
function chainable(table: string) {
  let limit = Number.POSITIVE_INFINITY
  const builder: Record<string, unknown> = {}
  for (const m of ['select', 'order', 'eq', 'in', 'neq', 'gte', 'lte', 'is', 'not', 'filter', 'range']) {
    builder[m] = () => builder
  }
  builder.limit = (n: number) => {
    limit = n
    if (table === 'transactions') limitsSeen.push(n)
    return builder
  }
  // oxlint-disable-next-line unicorn/no-thenable -- imita a propósito el query builder real de supabase-js.
  builder.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) =>
    Promise.resolve(resolve({ data: table === 'transactions' ? allTx.slice(0, Math.min(limit, TOTAL)) : [], error: null }))
  return builder
}

vi.mock('../../lib/supabase/client', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: (table: string) => chainable(table),
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }), onAuthStateChange: vi.fn() },
  },
}))
vi.mock('./useRealCategories', async () => {
  const actual = await vi.importActual<typeof import('./useRealCategories')>('./useRealCategories')
  const categories = [{ id: 'cat-1', name: 'Super', icon: null, categoryGroup: 'alimentacion', parentId: null }]
  return { ...actual, useRealCategories: () => ({ categories, loading: false, refetch: vi.fn() }) }
})
vi.mock('../settings/useRealConnections', () => ({
  useRealConnections: () => ({ connections: [], loading: false, refetch: vi.fn() }),
  latestSync: () => null,
}))
vi.mock('../accounts/useRealAccounts', () => ({
  useRealAccounts: () => ({ accounts: [], loading: false, refetch: vi.fn() }),
}))

const { TransactionsPage } = await import('./TransactionsPage')
const { useTransactionsStore } = await import('./store')
const { useAuthStore } = await import('../../lib/supabase/useAuth')

const activeSession = { user: { id: 'user-1' } } as unknown as Session

function renderPage() {
  return render(
    <BrowserRouter>
      <TransactionsPage />
    </BrowserRouter>,
  )
}

/** Deja que corran la carga inicial y la recarga que dispara loadAll. */
async function settle() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 300))
  })
}

describe('el Centro de revisión trabaja sobre el histórico entero', () => {
  beforeEach(() => {
    limitsSeen.length = 0
  })
  afterEach(() => {
    useTransactionsStore.setState({ view: 'tabla', searchQuery: '' })
    useAuthStore.setState({ session: null })
  })

  it('entrando directo, la pareja de la posición 400 llega a la tarjeta', async () => {
    useAuthStore.setState({ session: activeSession })
    useTransactionsStore.setState({ view: 'revision' })
    renderPage()
    await waitFor(() => expect(screen.getByText(/movimientos sincronizados/)).toBeInTheDocument())
    await settle()

    expect(limitsSeen).toEqual([300, 10_000])
    expect(screen.getByText(`${TOTAL} movimientos sincronizados`)).toBeInTheDocument()
    // Lo que de verdad importa: la pareja se ve, con las dos divisas y con un
    // importe distinto a cada lado (PLN sale como código, no tiene símbolo).
    expect(screen.getByText(/Dinero tuyo cambiando de cuenta/)).toBeInTheDocument()
    expect(screen.getByText('46,63 €')).toBeInTheDocument()
    expect(screen.getByText('200,00 PLN')).toBeInTheDocument()
  })

  it('llegando desde la tabla, pulsar Centro de revisión también la trae', async () => {
    useAuthStore.setState({ session: activeSession })
    useTransactionsStore.setState({ view: 'tabla' })
    renderPage()
    await waitFor(() => expect(screen.getByText(/movimientos sincronizados/)).toBeInTheDocument())
    await settle()
    expect(limitsSeen).toEqual([300])

    fireEvent.click(screen.getByRole('button', { name: /Centro de revisión/ }))
    await settle()
    expect(limitsSeen).toEqual([300, 10_000])
    expect(screen.getByText('200,00 PLN')).toBeInTheDocument()
  })

  it('en la tabla y sin filtros no se trae todo: abrir la pantalla sigue costando una página', async () => {
    useAuthStore.setState({ session: activeSession })
    useTransactionsStore.setState({ view: 'tabla' })
    renderPage()
    await waitFor(() => expect(screen.getByText(/movimientos sincronizados/)).toBeInTheDocument())
    await settle()
    expect(limitsSeen).toEqual([300])
  })
})
