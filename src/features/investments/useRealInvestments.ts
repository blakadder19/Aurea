import { useEffect, useState } from 'react'
import type { Position } from '../../data/investments'
import { supabase } from '../../lib/supabase/client'
import { useAuthStore } from '../../lib/supabase/useAuth'

export interface RealInvestment {
  id: string
  name: string
  productType: string
  units: number | null
  avgCostCents: number | null
  valueCents: number
  contributedCents: number
}

interface RealInvestmentsResult {
  loading: boolean
  /** null mientras carga o si no hay sesión — no confundir con "cero posiciones". */
  investments: RealInvestment[] | null
  refetch: () => void
}

/** Posiciones de inversión reales del usuario autenticado (no archivadas), gestionadas a mano. */
export function useRealInvestments(): RealInvestmentsResult {
  const session = useAuthStore((s) => s.session)
  const [loading, setLoading] = useState(true)
  const [investments, setInvestments] = useState<RealInvestment[] | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!supabase || !session) {
      setInvestments(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    async function load() {
      if (!supabase) return
      const { data, error } = await supabase
        .from('investments')
        .select('id, name, product_type, units, avg_cost_cents, value_cents, contributed_cents')
        .eq('archived', false)
        .order('created_at', { ascending: true })
      if (cancelled) return
      if (error || !data) {
        console.error('useRealInvestments: fallo al leer investments', error)
        setInvestments([])
        setLoading(false)
        return
      }

      setInvestments(
        data.map((row) => ({
          id: row.id as string,
          name: row.name as string,
          productType: row.product_type as string,
          units: (row.units as number | null) ?? null,
          avgCostCents: (row.avg_cost_cents as number | null) ?? null,
          valueCents: row.value_cents as number,
          contributedCents: row.contributed_cents as number,
        })),
      )
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [session, version])

  return { loading, investments, refetch: () => setVersion((v) => v + 1) }
}

interface SaveInvestmentInput {
  id?: string
  name: string
  productType: string
  units: number | null
  avgCostCents: number | null
  valueCents: number
  contributedCents: number
}

/** Crea o actualiza una posición real. RLS asegura que solo puede tocar las suyas. */
export async function saveInvestment(input: SaveInvestmentInput): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'
  if (!input.name.trim()) return 'Ponle un nombre a la posición.'
  if (!Number.isInteger(input.valueCents) || input.valueCents < 0) return 'El valor no puede ser negativo.'
  if (!Number.isInteger(input.contributedCents) || input.contributedCents < 0) return 'Lo aportado no puede ser negativo.'

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 'Inicia sesión de nuevo para guardar la posición.'

  const payload = {
    user_id: user.id,
    name: input.name.trim(),
    product_type: input.productType.trim() || 'Otros',
    units: input.units,
    avg_cost_cents: input.avgCostCents,
    value_cents: input.valueCents,
    contributed_cents: input.contributedCents,
  }

  const { error } = input.id
    ? await supabase.from('investments').update(payload).eq('id', input.id)
    : await supabase.from('investments').insert(payload)
  if (error) {
    console.error('saveInvestment: fallo al guardar', error)
    return 'No hemos podido guardar la posición. Inténtalo de nuevo.'
  }
  return null
}

/** Archiva una posición (deja de contar en el seguimiento). Reversible: ver unarchiveInvestment. */
export async function archiveInvestment(id: string): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'
  const { error } = await supabase.from('investments').update({ archived: true }).eq('id', id)
  if (error) {
    console.error('archiveInvestment: fallo al archivar', error)
    return 'No hemos podido archivar la posición. Inténtalo de nuevo.'
  }
  return null
}

/** Deshace un archivado. */
export async function unarchiveInvestment(id: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('investments').update({ archived: false }).eq('id', id)
  if (error) console.error('unarchiveInvestment: fallo al deshacer', error)
}

const euros = (cents: number) => cents / 100

/** Convierte una posición real a la misma forma (euros) que ya consume PositionsTable. */
export function toPositionRow(inv: RealInvestment): Position {
  const value = euros(inv.valueCents)
  const contributed = euros(inv.contributedCents)
  const gain = value - contributed
  const gainPct = contributed > 0 ? (gain / contributed) * 100 : 0
  return {
    id: inv.id,
    name: inv.name,
    units: inv.units,
    avgCost: inv.avgCostCents !== null ? euros(inv.avgCostCents) : null,
    value,
    contributed,
    gain,
    gainPct,
    productType: inv.productType,
  }
}
