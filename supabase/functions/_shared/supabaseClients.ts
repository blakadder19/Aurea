import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from './config.ts'

/**
 * Cliente con el JWT del propio usuario — toda escritura pasa por RLS, nunca
 * `service-role`. Mismo patrón que `userClient(token)` en Finanzas.
 */
export function userClient(accessToken: string): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}

/**
 * Cliente con la clave de servicio — SOLO para `oauth_states`, la única tabla
 * sin RLS de usuario final (en el paso `callback` puede no haber sesión de
 * navegador activa todavía). Nunca se usa para leer/escribir datos bancarios.
 */
export function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
}

/** Resuelve el user_id a partir del Bearer token, o null si no es válido. */
export async function resolveUserId(accessToken: string): Promise<string | null> {
  const client = userClient(accessToken)
  const { data, error } = await client.auth.getUser(accessToken)
  if (error || !data.user) return null
  return data.user.id
}
