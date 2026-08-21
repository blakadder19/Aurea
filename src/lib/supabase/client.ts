import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/** Si faltan las variables de entorno, la app sigue funcionando en modo demostración. */
export const isSupabaseConfigured = Boolean(url && publishableKey)

/**
 * Cliente único de Supabase para el navegador. Solo la clave pública
 * (publishable/anon); toda escritura pasa por RLS con el JWT del usuario —
 * nunca una clave "service-role" en el cliente.
 */
export const supabase = isSupabaseConfigured
  ? createClient(url, publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null
