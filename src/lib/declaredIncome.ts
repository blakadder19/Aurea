import { useEffect, useState } from 'react'
import { supabase } from './supabase/client'
import { useAuthStore } from './supabase/useAuth'

/** Tipos de ingreso que puede declarar el usuario, o etiquetar en un movimiento positivo real. */
export const INCOME_TYPES = ['salario', 'extra', 'autonomo', 'inversion', 'alquiler', 'otro'] as const
export type IncomeType = (typeof INCOME_TYPES)[number]

export const INCOME_TYPE_LABELS: Record<IncomeType, string> = {
  salario: 'Salario',
  extra: 'Ingreso extra',
  autonomo: 'Autónomo / freelance',
  inversion: 'Inversión (dividendos, plusvalías...)',
  alquiler: 'Alquiler cobrado',
  otro: 'Otro',
}

/**
 * Ingresos declarados a mano por el usuario (sueldo en efectivo, cuenta no
 * conectada, etc.) — se SUMAN a lo que ya se detecta en movimientos, nunca
 * lo sustituyen. Un importe mensual fijo por fila, sin frecuencias
 * complejas por ahora.
 */
export interface DeclaredIncome {
  id: string
  name: string
  amountCents: number
  active: boolean
  incomeType: IncomeType | null
}

export async function fetchDeclaredIncomes(): Promise<DeclaredIncome[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('declared_incomes')
    .select('id, name, amount_cents, active, income_type')
    .order('created_at', { ascending: true })
  if (error || !data) {
    if (error) console.error('fetchDeclaredIncomes: fallo al leer', error)
    return []
  }
  return data.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    amountCents: r.amount_cents as number,
    active: Boolean(r.active),
    incomeType: (r.income_type as IncomeType | null) ?? null,
  }))
}

/** Suma de los ingresos declarados activos, en céntimos — para sumarlo al ingreso ya detectado en movimientos. */
export async function fetchActiveDeclaredIncomeCents(): Promise<number> {
  const all = await fetchDeclaredIncomes()
  return all.filter((i) => i.active).reduce((sum, i) => sum + i.amountCents, 0)
}

export async function createDeclaredIncome(name: string, amountCents: number, incomeType: IncomeType | null = null): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'
  if (!name.trim()) return 'Ponle un nombre al ingreso.'
  if (!Number.isInteger(amountCents) || amountCents <= 0) return 'El importe debe ser mayor que 0.'

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 'Inicia sesión de nuevo.'

  const { error } = await supabase
    .from('declared_incomes')
    .insert({ user_id: user.id, name: name.trim(), amount_cents: amountCents, income_type: incomeType })
  if (error) {
    console.error('createDeclaredIncome: fallo al guardar', error)
    return 'No hemos podido guardar el ingreso. Inténtalo de nuevo.'
  }
  return null
}

export async function setDeclaredIncomeActive(id: string, active: boolean): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'
  const { error } = await supabase.from('declared_incomes').update({ active }).eq('id', id)
  if (error) {
    console.error('setDeclaredIncomeActive: fallo al guardar', error)
    return 'No hemos podido guardar el cambio. Inténtalo de nuevo.'
  }
  return null
}

interface UseDeclaredIncomesResult {
  loading: boolean
  /** null mientras carga o si no hay sesión. */
  incomes: DeclaredIncome[] | null
  refetch: () => void
}

/** Lista de ingresos declarados del usuario autenticado, para la UI de alta/baja en Ajustes. */
export function useDeclaredIncomes(): UseDeclaredIncomesResult {
  const session = useAuthStore((s) => s.session)
  const [loading, setLoading] = useState(true)
  const [incomes, setIncomes] = useState<DeclaredIncome[] | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!supabase || !session) {
      setIncomes(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    fetchDeclaredIncomes().then((data) => {
      if (cancelled) return
      setIncomes(data)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [session, version])

  return { loading, incomes, refetch: () => setVersion((v) => v + 1) }
}
