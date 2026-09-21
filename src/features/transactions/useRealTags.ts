import { useEffect, useState } from 'react'
import type { TransactionTag } from '../../data/transactions'
import { defaultTagColor } from '../../lib/tagColor'
import { supabase } from '../../lib/supabase/client'
import { useAuthStore } from '../../lib/supabase/useAuth'
import { useTransactionsRefreshBus } from './refreshBus'

interface RealTagsResult {
  loading: boolean
  /** null mientras carga o si no hay sesión — no confundir con "no tienes etiquetas". */
  tags: TransactionTag[] | null
  refetch: () => void
}

/**
 * El catálogo de etiquetas del usuario, leído de la tabla `tags`.
 *
 * Que salga de la tabla y no de los movimientos cargados importa: antes las
 * opciones del filtro se sacaban de la primera página de 300, así que una
 * etiqueta que solo estuviera en movimientos más antiguos no aparecía, y había
 * pescadilla — para cargarlo todo hacía falta filtrar, y para filtrar hacía
 * falta ver la opción. Ahora una etiqueta existe aunque no la lleve nadie.
 */
export function useRealTags(): RealTagsResult {
  const session = useAuthStore((s) => s.session)
  const [loading, setLoading] = useState(true)
  const [tags, setTags] = useState<TransactionTag[] | null>(null)
  const version = useTransactionsRefreshBus((s) => s.version)
  const bump = useTransactionsRefreshBus((s) => s.bump)

  useEffect(() => {
    if (!supabase || !session) {
      setTags(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)

    async function load() {
      if (!supabase) return
      const { data, error } = await supabase.from('tags').select('id, name, emoji, color').order('name')
      if (cancelled) return
      if (error || !data) {
        console.error('useRealTags: fallo al leer las etiquetas', error)
        setTags([])
        setLoading(false)
        return
      }
      setTags(
        data.map((row) => ({
          id: row.id as string,
          name: row.name as string,
          emoji: (row.emoji as string | null) ?? null,
          color: (row.color as string | null) ?? 'cat-1',
        })),
      )
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [session, version])

  return { loading, tags, refetch: bump }
}

/**
 * Crea una etiqueta. Nunca implícito: el usuario tiene que pedirlo, porque
 * crear sin querer es como se llega a tener "viaje", "Viaje" y "viaje-china"
 * como tres cosas.
 *
 * El índice único es por nombre en minúsculas, así que "Viaje" choca con
 * "viaje" y se avisa en vez de duplicar.
 */
export async function createTag(
  name: string,
  emoji: string | null,
  color?: string,
): Promise<{ error: string | null; tag: TransactionTag | null }> {
  if (!supabase) return { error: 'Supabase no está configurado.', tag: null }
  const trimmed = name.trim()
  if (!trimmed) return { error: 'Escribe un nombre para la etiqueta.', tag: null }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Inicia sesión de nuevo para crear la etiqueta.', tag: null }

  const { data, error } = await supabase
    .from('tags')
    .insert({ user_id: user.id, name: trimmed, emoji: emoji || null, color: color ?? defaultTagColor(trimmed) })
    .select('id, name, emoji, color')
    .single()

  if (error) {
    // 23505 = índice único: ya existe con ese nombre, mayúsculas aparte.
    if ((error as { code?: string }).code === '23505') {
      return { error: `Ya tienes una etiqueta que se llama «${trimmed}».`, tag: null }
    }
    console.error('createTag: fallo al crear', error)
    return { error: 'No hemos podido crear la etiqueta. Inténtalo de nuevo.', tag: null }
  }

  return {
    error: null,
    tag: { id: data.id as string, name: data.name as string, emoji: (data.emoji as string | null) ?? null, color: data.color as string },
  }
}
