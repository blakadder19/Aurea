import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase/client'
import { useAuthStore } from '../../lib/supabase/useAuth'

export interface RealCategory {
  id: string
  name: string
}

/**
 * Catálogo por defecto sembrado la primera vez que un usuario real no
 * tiene ninguna categoría — las mismas 9 etiquetas que ya usa la demo
 * (`filterCategories` en data/transactions.ts), no un catálogo ligado a
 * ningún usuario en concreto.
 */
const DEFAULT_CATEGORIES: { name: string; group: string }[] = [
  { name: 'Supermercado', group: 'alimentacion' },
  { name: 'Restaurantes', group: 'alimentacion' },
  { name: 'Hogar y facturas', group: 'vivienda' },
  { name: 'Transporte', group: 'transporte' },
  { name: 'Ocio y suscripciones', group: 'ocio' },
  { name: 'Ropa y cuidado', group: 'compras' },
  { name: 'Salud', group: 'salud' },
  { name: 'Otros', group: 'compras' },
  { name: 'Ingresos', group: 'ingresos' },
]

interface RealCategoriesResult {
  loading: boolean
  /** null mientras carga o si no hay sesión. */
  categories: RealCategory[] | null
}

/** Categorías del usuario autenticado; siembra el catálogo por defecto si aún no tiene ninguna. */
export function useRealCategories(): RealCategoriesResult {
  const session = useAuthStore((s) => s.session)
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<RealCategory[] | null>(null)

  useEffect(() => {
    if (!supabase || !session) {
      setCategories(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    async function load() {
      if (!supabase) return
      const { data, error } = await supabase.from('categories').select('id, name').order('name', { ascending: true })
      if (cancelled) return
      if (error) {
        console.error('useRealCategories: fallo al leer categories', error)
        setCategories([])
        setLoading(false)
        return
      }

      if ((data ?? []).length > 0) {
        setCategories(data as RealCategory[])
        setLoading(false)
        return
      }

      const { data: seeded, error: seedError } = await supabase
        .from('categories')
        .insert(DEFAULT_CATEGORIES.map((c) => ({ name: c.name, category_group: c.group })))
        .select('id, name')
      if (cancelled) return
      if (seedError) {
        console.error('useRealCategories: fallo al sembrar categories', seedError)
        setCategories([])
        setLoading(false)
        return
      }

      setCategories((seeded as RealCategory[]).sort((a, b) => a.name.localeCompare(b.name, 'es')))
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [session])

  return { loading, categories }
}
