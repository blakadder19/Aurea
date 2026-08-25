import { useEffect, useState } from 'react'
import { BUDGET_MONTH_START_OPTIONS, CURRENCY_OPTIONS, DATE_FORMAT_OPTIONS } from '../../data/settings'
import { supabase } from '../../lib/supabase/client'
import { useAuthStore } from '../../lib/supabase/useAuth'

export interface RealSettings {
  currency: string
  dateFormat: string
  budgetMonthStart: number
}

const DEFAULT_SETTINGS: RealSettings = {
  currency: CURRENCY_OPTIONS[0],
  dateFormat: DATE_FORMAT_OPTIONS[0],
  budgetMonthStart: BUDGET_MONTH_START_OPTIONS[0],
}

interface RealSettingsResult {
  loading: boolean
  /** null mientras carga o si no hay sesión. */
  settings: RealSettings | null
  /** Devuelve un mensaje de error, o null si se guardó bien. */
  save: (patch: Partial<RealSettings>) => Promise<string | null>
}

/**
 * Ajustes básicos reales (moneda, formato de fecha, inicio del mes
 * presupuestario), una fila por usuario. Sin fila todavía = valores por
 * defecto, la primera vez que el usuario cambia algo se crea la fila.
 */
export function useRealSettings(): RealSettingsResult {
  const session = useAuthStore((s) => s.session)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<RealSettings | null>(null)

  useEffect(() => {
    if (!supabase || !session) {
      setSettings(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    async function load() {
      if (!supabase) return
      const { data, error } = await supabase
        .from('user_settings')
        .select('currency, date_format, budget_month_start')
        .maybeSingle()
      if (cancelled) return
      if (error) {
        console.error('useRealSettings: fallo al leer user_settings', error)
        setSettings(DEFAULT_SETTINGS)
        setLoading(false)
        return
      }

      setSettings(
        data
          ? { currency: data.currency, dateFormat: data.date_format, budgetMonthStart: data.budget_month_start }
          : DEFAULT_SETTINGS,
      )
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [session])

  async function save(patch: Partial<RealSettings>): Promise<string | null> {
    if (!supabase || !session) return 'No hay sesión.'
    const merged = { ...(settings ?? DEFAULT_SETTINGS), ...patch }
    setSettings(merged)
    const { error } = await supabase.from('user_settings').upsert({
      user_id: session.user.id,
      currency: merged.currency,
      date_format: merged.dateFormat,
      budget_month_start: merged.budgetMonthStart,
    })
    if (error) {
      console.error('useRealSettings: fallo al guardar', error)
      return 'No hemos podido guardar el cambio. Inténtalo de nuevo.'
    }
    return null
  }

  return { loading, settings, save }
}
