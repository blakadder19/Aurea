import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase/client'
import { useAuthStore } from '../../lib/supabase/useAuth'
import type { ScenarioParams } from './domain'

export interface SavedPlanningScenario {
  id: string
  name: string
  params: ScenarioParams
}

interface RealPlanningScenariosResult {
  loading: boolean
  scenarios: SavedPlanningScenario[]
  refetch: () => void
}

/** Escenarios de Planificación guardados por el usuario, además de los 3 presets fijos (optimista/base/pesimista). */
export function useRealPlanningScenarios(): RealPlanningScenariosResult {
  const session = useAuthStore((s) => s.session)
  const [loading, setLoading] = useState(true)
  const [scenarios, setScenarios] = useState<SavedPlanningScenario[]>([])
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!supabase || !session) {
      setScenarios([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    async function load() {
      if (!supabase) return
      const { data, error } = await supabase
        .from('planning_scenarios')
        .select('id, name, params')
        .order('created_at', { ascending: true })
      if (cancelled) return
      if (error || !data) {
        console.error('useRealPlanningScenarios: fallo al leer', error)
        setScenarios([])
        setLoading(false)
        return
      }
      setScenarios(data.map((row) => ({ id: row.id as string, name: row.name as string, params: row.params as ScenarioParams })))
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [session, version])

  return { loading, scenarios, refetch: () => setVersion((v) => v + 1) }
}

/** Guarda la configuración actual de sliders con un nombre para recuperarla después. */
export async function savePlanningScenario(name: string, params: ScenarioParams): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'
  if (!name.trim()) return 'Ponle un nombre al escenario.'

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 'Inicia sesión de nuevo.'

  const { error } = await supabase.from('planning_scenarios').insert({ user_id: user.id, name: name.trim(), params })
  if (error) {
    console.error('savePlanningScenario: fallo al guardar', error)
    return 'No hemos podido guardar el escenario. Inténtalo de nuevo.'
  }
  return null
}
