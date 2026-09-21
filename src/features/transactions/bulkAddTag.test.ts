import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Etiquetar en lote con UN solo movimiento seleccionado no prueba nada: el
 * fallo que llegó a producción era justo que algunos de la tanda se quedaban
 * sin etiqueta. Todo lo de aquí va con tres.
 *
 * El motivo de que se perdieran era el diseño: N escrituras independientes en
 * paralelo, y el único control era "¿alguna devolvió error?". Nadie contaba
 * filas, así que un lote a medias era indistinguible de uno completo. Ahora es
 * una sola sentencia que devuelve cuántos llevan la etiqueta al terminar.
 */

let rpcCalls: { fn: string; args: Record<string, unknown> }[] = []
let rpcResult: { data: unknown; error: unknown } = { data: 0, error: null }

vi.mock('../../lib/supabase/client', () => ({
  isSupabaseConfigured: true,
  supabase: {
    rpc: (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args })
      return Promise.resolve(rpcResult)
    },
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u' } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(),
    },
  },
}))

const { bulkAddTag, bulkRemoveTag } = await import('./useRealTransactions')

const THREE = ['tx-1', 'tx-2', 'tx-3']
const TAG_ID = 'tag-china'

beforeEach(() => {
  rpcCalls = []
  rpcResult = { data: 0, error: null }
})

describe('bulkAddTag', () => {
  it('manda LOS TRES en una sola llamada, no uno por movimiento', async () => {
    rpcResult = { data: 3, error: null }

    const result = await bulkAddTag(THREE, TAG_ID)

    expect(rpcCalls).toHaveLength(1)
    expect(rpcCalls[0]).toEqual({ fn: 'add_tag_to_transactions', args: { p_ids: THREE, p_tag_id: TAG_ID } })
    expect(result).toEqual({ error: null, taggedCount: 3 })
  })

  it('si vuelven menos de los que se mandaron, lo dice en vez de callarlo', async () => {
    // Este es exactamente el fallo que se escapó: dos de tres etiquetados y
    // el usuario enterándose al mirar la lista.
    rpcResult = { data: 2, error: null }

    const result = await bulkAddTag(THREE, TAG_ID)

    expect(result.taggedCount).toBe(2)
    expect(result.error).toBe('Solo hemos podido etiquetar 2 de 3 movimientos. Inténtalo de nuevo.')
  })

  it('si la base falla, no inventa que salió bien', async () => {
    rpcResult = { data: null, error: { message: 'boom' } }

    const result = await bulkAddTag(THREE, TAG_ID)

    expect(result.taggedCount).toBe(0)
    expect(result.error).not.toBeNull()
  })

  it('sin etiqueta no llama a la base', async () => {
    const result = await bulkAddTag(THREE, '')
    expect(rpcCalls).toEqual([])
    expect(result.error).not.toBeNull()
  })

  it('sin selección no llama a la base', async () => {
    const result = await bulkAddTag([], TAG_ID)
    expect(rpcCalls).toEqual([])
    expect(result).toEqual({ error: null, taggedCount: 0 })
  })
})

describe('bulkRemoveTag', () => {
  it('quita la etiqueta de LOS TRES en una sola llamada', async () => {
    rpcResult = { data: 3, error: null }

    const result = await bulkRemoveTag(THREE, TAG_ID)

    expect(rpcCalls).toHaveLength(1)
    expect(rpcCalls[0]).toEqual({ fn: 'remove_tag_from_transactions', args: { p_ids: THREE, p_tag_id: TAG_ID } })
    expect(result).toEqual({ error: null, removedCount: 3 })
  })

  it('si se quita de menos de los que se mandaron, lo dice', async () => {
    rpcResult = { data: 2, error: null }

    const result = await bulkRemoveTag(THREE, TAG_ID)

    expect(result.removedCount).toBe(2)
    expect(result.error).toBe('Solo hemos podido quitarla de 2 de 3 movimientos. Inténtalo de nuevo.')
  })

  it('si la base falla, no inventa que salió bien', async () => {
    rpcResult = { data: null, error: { message: 'boom' } }
    const result = await bulkRemoveTag(THREE, TAG_ID)
    expect(result.removedCount).toBe(0)
    expect(result.error).not.toBeNull()
  })
})
