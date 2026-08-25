import { describe, expect, it, vi } from 'vitest'

function chainable(data: unknown[] | null, error: unknown = null) {
  const builder: Record<string, unknown> = {}
  for (const method of ['select', 'order']) {
    builder[method] = () => builder
  }
  // oxlint-disable-next-line unicorn/no-thenable -- imita a propósito el query builder real de supabase-js.
  builder.then = (resolve: (v: { data: unknown[] | null; error: unknown }) => unknown) => Promise.resolve(resolve({ data, error }))
  return builder
}

function stubDownload() {
  let capturedBlob: Blob | null = null
  let capturedFilename = ''
  vi.stubGlobal('URL', { createObjectURL: vi.fn((blob: Blob) => { capturedBlob = blob; return 'blob:mock' }), revokeObjectURL: vi.fn() })
  const clickSpy = vi.fn()
  const realCreateElement = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
    const el = realCreateElement(tag)
    if (tag === 'a') {
      el.click = clickSpy
      Object.defineProperty(el, 'download', {
        configurable: true,
        get() { return capturedFilename },
        set(v) { capturedFilename = v },
      })
    }
    return el
  })
  return {
    getBlob: () => capturedBlob,
    getFilename: () => capturedFilename,
    restore: () => {
      vi.unstubAllGlobals()
      vi.restoreAllMocks()
    },
  }
}

describe('exportTransactionsCsv', () => {
  it('sin movimientos, no descarga nada y avisa', async () => {
    vi.resetModules()
    const mockFrom = vi.fn(() => chainable([]))
    vi.doMock('../../lib/supabase/client', () => ({ isSupabaseConfigured: true, supabase: { from: mockFrom } }))
    const { exportTransactionsCsv } = await import('./exportData')

    const error = await exportTransactionsCsv()
    expect(error).toBe('Todavía no tienes movimientos que exportar.')
  })

  it('genera un CSV con cabecera y una fila por movimiento, resolviendo cuenta y categoría', async () => {
    vi.resetModules()
    const fixtures: Record<string, unknown[]> = {
      transactions: [
        { booking_date: '2026-08-25', value_date: null, description: 'Mercadona', amount_cents: -6218, account_id: 'acc-1', category_id: 'cat-1', user_note: 'Compra semanal', tags: ['Casa'] },
      ],
      accounts: [{ id: 'acc-1', name: 'Nómina', product: null }],
      categories: [{ id: 'cat-1', name: 'Supermercado' }],
    }
    const mockFrom = vi.fn((table: string) => chainable(fixtures[table] ?? []))
    vi.doMock('../../lib/supabase/client', () => ({ isSupabaseConfigured: true, supabase: { from: mockFrom } }))
    const { exportTransactionsCsv } = await import('./exportData')

    const download = stubDownload()
    const error = await exportTransactionsCsv()
    expect(error).toBeNull()

    const text = await download.getBlob()!.text()
    expect(text).toContain('Fecha,Comercio,Cuenta,Categoría,Importe,Nota,Etiquetas')
    expect(text).toContain('2026-08-25,Mercadona,Nómina,Supermercado,-62.18,Compra semanal,Casa')
    expect(download.getFilename()).toMatch(/^aurea-movimientos-\d{4}-\d{2}-\d{2}\.csv$/)
    download.restore()
  })

  it('un movimiento sin categoría se exporta como "Sin clasificar"', async () => {
    vi.resetModules()
    const fixtures: Record<string, unknown[]> = {
      transactions: [{ booking_date: '2026-08-25', value_date: null, description: 'Alipay', amount_cents: -100, account_id: 'acc-1', category_id: null, user_note: null, tags: [] }],
      accounts: [{ id: 'acc-1', name: 'Nómina', product: null }],
      categories: [],
    }
    const mockFrom = vi.fn((table: string) => chainable(fixtures[table] ?? []))
    vi.doMock('../../lib/supabase/client', () => ({ isSupabaseConfigured: true, supabase: { from: mockFrom } }))
    const { exportTransactionsCsv } = await import('./exportData')

    const download = stubDownload()
    await exportTransactionsCsv()
    const text = await download.getBlob()!.text()
    expect(text).toContain('Sin clasificar')
    download.restore()
  })

  it('si Supabase falla, devuelve un mensaje de error y no descarga nada', async () => {
    vi.resetModules()
    const mockFrom = vi.fn(() => chainable(null, { message: 'boom' }))
    vi.doMock('../../lib/supabase/client', () => ({ isSupabaseConfigured: true, supabase: { from: mockFrom } }))
    const { exportTransactionsCsv } = await import('./exportData')

    const error = await exportTransactionsCsv()
    expect(error).toBe('No hemos podido exportar tus movimientos. Inténtalo de nuevo.')
  })
})

describe('exportAllDataJson', () => {
  it('descarga un JSON con todas las tablas reales', async () => {
    vi.resetModules()
    const fixtures: Record<string, unknown[]> = {
      accounts: [{ id: 'acc-1' }],
      transactions: [{ id: 'tx-1' }],
      categories: [{ id: 'cat-1' }],
      budgets: [],
      goals: [],
      debt_details: [],
      investments: [],
    }
    const mockFrom = vi.fn((table: string) => chainable(fixtures[table] ?? []))
    vi.doMock('../../lib/supabase/client', () => ({ isSupabaseConfigured: true, supabase: { from: mockFrom } }))
    const { exportAllDataJson } = await import('./exportData')

    const download = stubDownload()
    const error = await exportAllDataJson()
    expect(error).toBeNull()

    const text = await download.getBlob()!.text()
    const parsed = JSON.parse(text)
    expect(parsed.accounts).toEqual([{ id: 'acc-1' }])
    expect(parsed.transactions).toEqual([{ id: 'tx-1' }])
    expect(download.getFilename()).toMatch(/^aurea-datos-\d{4}-\d{2}-\d{2}\.json$/)
    download.restore()
  })
})
