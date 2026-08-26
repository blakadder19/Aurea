import { useEffect, useState } from 'react'
import type { Goal } from '../../data/goals'
import { supabase } from '../../lib/supabase/client'
import { useAuthStore } from '../../lib/supabase/useAuth'

export interface RealGoal {
  id: string
  name: string
  targetCents: number
  savedCents: number
  monthlyContributionCents: number
}

interface RealGoalsResult {
  loading: boolean
  /** null mientras carga o si no hay sesión — no confundir con "cero objetivos". */
  goals: RealGoal[] | null
  refetch: () => void
}

/** Objetivos reales del usuario autenticado (no archivados). */
export function useRealGoals(): RealGoalsResult {
  const session = useAuthStore((s) => s.session)
  const [loading, setLoading] = useState(true)
  const [goals, setGoals] = useState<RealGoal[] | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!supabase || !session) {
      setGoals(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    async function load() {
      if (!supabase) return
      const { data, error } = await supabase
        .from('goals')
        .select('id, name, target_cents, saved_cents, monthly_contribution_cents')
        .eq('archived', false)
        .order('created_at', { ascending: true })
      if (cancelled) return
      if (error || !data) {
        console.error('useRealGoals: fallo al leer goals', error)
        setGoals([])
        setLoading(false)
        return
      }

      setGoals(
        data.map((row) => ({
          id: row.id as string,
          name: row.name as string,
          targetCents: row.target_cents as number,
          savedCents: row.saved_cents as number,
          monthlyContributionCents: row.monthly_contribution_cents as number,
        })),
      )
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [session, version])

  return { loading, goals, refetch: () => setVersion((v) => v + 1) }
}

/** Crea un objetivo real. RLS asegura que solo puede crear los suyos. */
export async function createGoal(name: string, targetCents: number, monthlyContributionCents: number): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'
  if (!name.trim()) return 'Ponle un nombre al objetivo.'
  if (!Number.isInteger(targetCents) || targetCents <= 0) return 'El objetivo debe ser un importe mayor que 0.'
  if (!Number.isInteger(monthlyContributionCents) || monthlyContributionCents < 0) return 'La aportación mensual no puede ser negativa.'

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 'Inicia sesión de nuevo para crear el objetivo.'

  const { error } = await supabase.from('goals').insert({
    user_id: user.id,
    name: name.trim(),
    target_cents: targetCents,
    monthly_contribution_cents: monthlyContributionCents,
  })
  if (error) {
    console.error('createGoal: fallo al crear', error)
    return 'No hemos podido crear el objetivo. Inténtalo de nuevo.'
  }
  return null
}

/** Actualiza nombre, importe objetivo y aportación mensual de un objetivo existente. */
export async function updateGoal(id: string, name: string, targetCents: number, monthlyContributionCents: number): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'
  if (!name.trim()) return 'Ponle un nombre al objetivo.'
  if (!Number.isInteger(targetCents) || targetCents <= 0) return 'El objetivo debe ser un importe mayor que 0.'
  if (!Number.isInteger(monthlyContributionCents) || monthlyContributionCents < 0) return 'La aportación mensual no puede ser negativa.'

  const { error } = await supabase
    .from('goals')
    .update({ name: name.trim(), target_cents: targetCents, monthly_contribution_cents: monthlyContributionCents })
    .eq('id', id)
  if (error) {
    console.error('updateGoal: fallo al actualizar', error)
    return 'No hemos podido guardar los cambios. Inténtalo de nuevo.'
  }
  return null
}

/** Archiva un objetivo (deja de contar en el seguimiento). Reversible: ver unarchiveGoal. */
export async function archiveGoal(id: string): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'
  const { error } = await supabase.from('goals').update({ archived: true }).eq('id', id)
  if (error) {
    console.error('archiveGoal: fallo al archivar', error)
    return 'No hemos podido archivar el objetivo. Inténtalo de nuevo.'
  }
  return null
}

/** Deshace un archivado. */
export async function unarchiveGoal(id: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('goals').update({ archived: false }).eq('id', id)
  if (error) console.error('unarchiveGoal: fallo al deshacer', error)
}

/** Registra una aportación: suma amountCents al ahorrado del objetivo. */
export async function contributeToGoal(goalId: string, currentSavedCents: number, amountCents: number): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'
  if (!Number.isInteger(amountCents) || amountCents <= 0) return 'La aportación debe ser un importe mayor que 0.'

  const { error } = await supabase
    .from('goals')
    .update({ saved_cents: currentSavedCents + amountCents })
    .eq('id', goalId)
  if (error) {
    console.error('contributeToGoal: fallo al guardar', error)
    return 'No hemos podido registrar la aportación. Inténtalo de nuevo.'
  }
  return null
}

/** Deshace una aportación: vuelve a dejar saved_cents en el valor que tenía justo antes. */
export async function revertGoalContribution(goalId: string, previousSavedCents: number): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('goals').update({ saved_cents: previousSavedCents }).eq('id', goalId)
  if (error) console.error('revertGoalContribution: fallo al deshacer', error)
}

const euros = (cents: number) => Math.round(cents / 100)

/** Convierte un objetivo real a la misma forma (euros) que ya consume GoalCard. */
export function toGoalCardProps(g: RealGoal): Goal {
  const saved = euros(g.savedCents)
  const target = euros(g.targetCents)
  const monthlyContribution = euros(g.monthlyContributionCents)

  if (saved >= target) {
    return { id: g.id, name: g.name, saved, target, monthlyContribution, status: 'success', statusLabel: 'Completado', note: 'objetivo alcanzado' }
  }
  if (monthlyContribution > 0) {
    return {
      id: g.id,
      name: g.name,
      saved,
      target,
      monthlyContribution,
      status: 'success',
      statusLabel: 'Al día',
      note: `aportando ${monthlyContribution} €/mes`,
    }
  }
  return {
    id: g.id,
    name: g.name,
    saved,
    target,
    monthlyContribution,
    status: 'danger',
    statusLabel: 'Sin aportación',
    note: 'sin aportación mensual definida, no hay fecha estimada',
  }
}
