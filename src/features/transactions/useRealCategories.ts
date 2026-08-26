import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase/client'
import { useAuthStore } from '../../lib/supabase/useAuth'

export interface RealCategory {
  id: string
  name: string
  icon: string | null
  /** Uno de los valores fijos del CHECK de la tabla — agrupa la categoría en Presupuesto y Ajustes. */
  categoryGroup: string
}

/** Etiqueta en español de cada `category_group` — mismo conjunto fijo que el CHECK de la tabla `categories`. */
export const CATEGORY_GROUP_LABEL: Record<string, string> = {
  ingresos: 'Ingresos',
  vivienda: 'Vivienda',
  alimentacion: 'Alimentación',
  transporte: 'Transporte',
  ocio: 'Ocio',
  suscripciones: 'Suscripciones',
  salud: 'Salud',
  compras: 'Compras',
  finanzas: 'Finanzas',
  transferencias: 'Transferencias',
}

/** Orden fijo en el que se muestran los grupos allá donde se agrupan categorías. */
export const CATEGORY_GROUP_ORDER = Object.keys(CATEGORY_GROUP_LABEL)

export function categoryGroupLabel(group: string): string {
  return CATEGORY_GROUP_LABEL[group] ?? group
}

/**
 * Catálogo por defecto sembrado la primera vez que un usuario real no
 * tiene ninguna categoría — las mismas 9 etiquetas que ya usa la demo
 * (`filterCategories` en data/transactions.ts), no un catálogo ligado a
 * ningún usuario en concreto.
 */
const DEFAULT_CATEGORIES: { name: string; group: string; icon: string }[] = [
  { name: 'Supermercado', group: 'alimentacion', icon: '🛒' },
  { name: 'Restaurantes', group: 'alimentacion', icon: '🍽️' },
  { name: 'Hogar y facturas', group: 'vivienda', icon: '🏠' },
  { name: 'Transporte', group: 'transporte', icon: '🚗' },
  { name: 'Ocio y suscripciones', group: 'ocio', icon: '🎬' },
  { name: 'Ropa y cuidado', group: 'compras', icon: '👕' },
  { name: 'Salud', group: 'salud', icon: '💊' },
  { name: 'Otros', group: 'compras', icon: '📦' },
  { name: 'Ingresos', group: 'ingresos', icon: '💰' },
]

function toRealCategory(row: { id: string; name: string; icon: string | null; category_group: string }): RealCategory {
  return { id: row.id, name: row.name, icon: row.icon, categoryGroup: row.category_group }
}

interface RealCategoriesResult {
  loading: boolean
  /** null mientras carga o si no hay sesión. */
  categories: RealCategory[] | null
  refetch: () => void
}

/** Categorías del usuario autenticado; siembra el catálogo por defecto si aún no tiene ninguna. */
export function useRealCategories(): RealCategoriesResult {
  const session = useAuthStore((s) => s.session)
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<RealCategory[] | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!supabase || !session) {
      setCategories(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    const userId = session.user.id

    async function load() {
      if (!supabase) return
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, icon, category_group')
        .order('name', { ascending: true })
      if (cancelled) return
      if (error) {
        console.error('useRealCategories: fallo al leer categories', error)
        setCategories([])
        setLoading(false)
        return
      }

      if ((data ?? []).length > 0) {
        setCategories(data.map(toRealCategory))
        setLoading(false)
        return
      }

      const { data: seeded, error: seedError } = await supabase
        .from('categories')
        .upsert(
          DEFAULT_CATEGORIES.map((c) => ({ user_id: userId, name: c.name, category_group: c.group, icon: c.icon })),
          { onConflict: 'user_id,name' },
        )
        .select('id, name, icon, category_group')
      if (cancelled) return
      if (seedError) {
        console.error('useRealCategories: fallo al sembrar categories', seedError)
        setCategories([])
        setLoading(false)
        return
      }

      setCategories((seeded ?? []).map(toRealCategory).sort((a, b) => a.name.localeCompare(b.name, 'es')))
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [session, version])

  return { loading, categories, refetch: () => setVersion((v) => v + 1) }
}

/** "🛒 Supermercado" si tiene icono, si no solo el nombre. */
export function categoryLabel(c: { name: string; icon: string | null }): string {
  return c.icon ? `${c.icon} ${c.name}` : c.name
}

/** Guarda el icono/emoji de una categoría. */
export async function updateCategoryIcon(id: string, icon: string): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'
  const { error } = await supabase.from('categories').update({ icon: icon.trim() || null }).eq('id', id)
  if (error) {
    console.error('updateCategoryIcon: fallo al guardar', error)
    return 'No hemos podido guardar el icono. Inténtalo de nuevo.'
  }
  return null
}

/**
 * Crea una categoría propia además del catálogo por defecto. Grupo genérico
 * 'compras' — mismo grupo que usa la categoría "Otros" sembrada por
 * defecto — sin selector de grupo por ahora. `category_group` tiene un
 * CHECK en la base de datos con un conjunto fijo de valores; 'compras' es
 * el más neutro de los que ya admite.
 */
export async function createCategory(name: string, icon: string): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'
  if (!name.trim()) return 'Ponle un nombre a la categoría.'

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 'Inicia sesión de nuevo.'

  const { error } = await supabase
    .from('categories')
    .insert({ user_id: user.id, name: name.trim(), category_group: 'compras', icon: icon.trim() || null })
  if (error) {
    console.error('createCategory: fallo al crear', error)
    if (error.code === '23505') return 'Ya tienes una categoría con ese nombre.'
    return 'No hemos podido crear la categoría. Inténtalo de nuevo.'
  }
  return null
}

/**
 * Borra una categoría propia. Sin ON DELETE CASCADE en transactions/budgets/
 * rules.category_id a propósito — si tiene movimientos, presupuestos o
 * reglas asociadas, el propio DELETE falla por la FK (23503) y se traduce
 * aquí a un mensaje legible en vez de dejar pasar el error crudo.
 */
export async function deleteCategory(id: string): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) {
    if (error.code === '23503') {
      return 'No puedes borrar esta categoría porque tiene movimientos, presupuestos o reglas asociadas. Cámbialos primero a otra categoría.'
    }
    console.error('deleteCategory: fallo al borrar', error)
    return 'No hemos podido borrar la categoría. Inténtalo de nuevo.'
  }
  return null
}
