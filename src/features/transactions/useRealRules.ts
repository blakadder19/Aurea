import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase/client'
import { useAuthStore } from '../../lib/supabase/useAuth'

/** Regla de clasificación: createRuleFromTransaction las crea, persistCollected (sync bancario) las reaplica a cada movimiento nuevo. */
export interface RealRule {
  id: string
  matchValue: string
  categoryId: string
}

interface RealRulesResult {
  loading: boolean
  /** null mientras carga o si no hay sesión. */
  rules: RealRule[] | null
  refetch: () => void
}

export function useRealRules(): RealRulesResult {
  const session = useAuthStore((s) => s.session)
  const [loading, setLoading] = useState(true)
  const [rules, setRules] = useState<RealRule[] | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!supabase || !session) {
      setRules(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    async function load() {
      if (!supabase) return
      const { data, error } = await supabase
        .from('rules')
        .select('id, match_value, category_id')
        .order('created_at', { ascending: false })
      if (cancelled) return
      if (error || !data) {
        console.error('useRealRules: fallo al leer rules', error)
        setRules([])
        setLoading(false)
        return
      }

      setRules(data.map((r) => ({ id: r.id as string, matchValue: r.match_value as string, categoryId: r.category_id as string })))
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [session, version])

  return { loading, rules, refetch: () => setVersion((v) => v + 1) }
}

/** Borra una regla — no toca los movimientos ya clasificados por ella, solo deja de aplicarse a los que lleguen después. */
export async function deleteRule(id: string): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'
  const { error } = await supabase.from('rules').delete().eq('id', id)
  if (error) {
    console.error('deleteRule: fallo al borrar', error)
    return 'No hemos podido borrar la regla. Inténtalo de nuevo.'
  }
  return null
}
