import { describe, expect, it, vi } from 'vitest'

/**
 * Una regla sirve para rellenar huecos, no para pisar decisiones ya tomadas.
 *
 * Hasta el 18 sep 2026 la aplicación retroactiva era un `ilike` a secas:
 * crear una regla reclasificaba también los movimientos que el usuario ya
 * había puesto a mano en otra categoría, en silencio y sin deshacer.
 *
 * Y el texto a emparejar era la descripción entera, así que con comercios de
 * sufijo aleatorio ("Alipay*otherretail533") la regla no volvía a encajar
 * nunca. Ahora el texto lo elige quien la crea.
 */

interface Row {
  id: string
  description: string
  category_id: string | null
}

/** Las filas que "hay en la base". Cada test monta las suyas. */
let rows: Row[] = []
let splitIds: string[] = []
/** Lo que la función pide actualizar: la prueba de qué toca y qué no. */
let updatedIds: string[] = []
let insertedRules: Record<string, unknown>[] = []

function transactionsBuilder() {
  const filters: { like?: string; nullCategory?: boolean; ids?: string[] } = {}
  const builder: Record<string, unknown> = {}
  builder.select = () => builder
  builder.ilike = (_col: string, pattern: string) => {
    filters.like = pattern.replaceAll('%', '')
    return builder
  }
  builder.is = (col: string, value: unknown) => {
    if (col === 'category_id' && value === null) filters.nullCategory = true
    return builder
  }
  builder.in = (_col: string, ids: string[]) => {
    filters.ids = ids
    return builder
  }
  builder.update = () => builder
  // oxlint-disable-next-line unicorn/no-thenable -- imita a propósito el query builder real de supabase-js.
  builder.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) => {
    if (filters.ids) {
      updatedIds = filters.ids
      return Promise.resolve(resolve({ data: filters.ids.map((id) => ({ id })), error: null }))
    }
    const matched = rows.filter(
      (r) =>
        (filters.like === undefined || r.description.toLowerCase().includes(filters.like.toLowerCase())) &&
        (!filters.nullCategory || r.category_id === null),
    )
    return Promise.resolve(resolve({ data: matched.map((r) => ({ id: r.id })), error: null }))
  }
  return builder
}

function splitsBuilder() {
  const builder: Record<string, unknown> = {}
  builder.select = () => builder
  // oxlint-disable-next-line unicorn/no-thenable -- imita a propósito el query builder real de supabase-js.
  builder.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) =>
    Promise.resolve(resolve({ data: splitIds.map((id) => ({ transaction_id: id })), error: null }))
  return builder
}

function rulesBuilder() {
  const builder: Record<string, unknown> = {}
  builder.insert = (row: Record<string, unknown>) => {
    insertedRules.push(row)
    return builder
  }
  // oxlint-disable-next-line unicorn/no-thenable -- imita a propósito el query builder real de supabase-js.
  builder.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) => Promise.resolve(resolve({ data: [], error: null }))
  return builder
}

vi.mock('../../lib/supabase/client', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: (table: string) => {
      if (table === 'transactions') return transactionsBuilder()
      if (table === 'transaction_splits') return splitsBuilder()
      if (table === 'rules') return rulesBuilder()
      throw new Error(`tabla inesperada en el mock: ${table}`)
    },
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(),
    },
  },
}))

const { createRuleFromTransaction } = await import('./useRealTransactions')

function reset() {
  rows = []
  splitIds = []
  updatedIds = []
  insertedRules = []
}

describe('createRuleFromTransaction', () => {
  it('no toca un movimiento que ya tenía categoría puesta a mano', async () => {
    reset()
    rows = [
      { id: 'ya-clasificado', description: 'Alipay*otherretail533', category_id: 'cat-viajes' },
      { id: 'sin-clasificar', description: 'Alipay*otherretail173', category_id: null },
    ]

    const result = await createRuleFromTransaction('Alipay', 'cat-comida')

    expect(result.error).toBeNull()
    expect(updatedIds).toEqual(['sin-clasificar'])
    expect(updatedIds).not.toContain('ya-clasificado')
    expect(result.appliedCount).toBe(1)
  })

  it('un trozo del texto se lleva todos los sufijos aleatorios de golpe', async () => {
    reset()
    rows = [
      { id: 'a', description: 'Alipay*otherretail533', category_id: null },
      { id: 'b', description: 'Alipay*otherretail173', category_id: null },
      { id: 'c', description: 'Alipay*govagency', category_id: null },
      { id: 'd', description: 'Weixin*dessert Station', category_id: null },
    ]

    const result = await createRuleFromTransaction('Alipay', 'cat-viajes')

    expect(updatedIds).toEqual(['a', 'b', 'c'])
    expect(updatedIds).not.toContain('d')
    expect(result.appliedCount).toBe(3)
    expect(insertedRules[0]).toMatchObject({ match_field: 'description', match_value: 'Alipay', category_id: 'cat-viajes' })
  })

  it('un movimiento dividido ya está clasificado aunque su category_id sea null: tampoco se toca', async () => {
    reset()
    rows = [
      { id: 'dividido', description: 'Alipay*govagency', category_id: null },
      { id: 'normal', description: 'Alipay*otherretail533', category_id: null },
    ]
    splitIds = ['dividido']

    const result = await createRuleFromTransaction('Alipay', 'cat-comida')

    expect(updatedIds).toEqual(['normal'])
    expect(result.appliedCount).toBe(1)
  })

  it('si no hay nada sin clasificar que encaje, crea la regla y no actualiza nada', async () => {
    reset()
    rows = [{ id: 'ya-clasificado', description: 'Alipay*govagency', category_id: 'cat-viajes' }]

    const result = await createRuleFromTransaction('Alipay', 'cat-comida')

    expect(result.error).toBeNull()
    expect(result.appliedCount).toBe(0)
    expect(updatedIds).toEqual([])
    // La regla sí se guarda: vale para los que lleguen en la próxima sync.
    expect(insertedRules).toHaveLength(1)
  })

  it('sin texto no crea nada', async () => {
    reset()
    const result = await createRuleFromTransaction('   ', 'cat-comida')
    expect(result.error).not.toBeNull()
    expect(insertedRules).toEqual([])
    expect(updatedIds).toEqual([])
  })
})
