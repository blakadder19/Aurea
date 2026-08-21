import { serviceClient } from './supabaseClients.ts'

const TTL_MS = 10 * 60 * 1000

function randomValue(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Sustituye el `Map` en memoria de Finanzas (server/state.ts): una Edge
 * Function no conserva estado entre invocaciones, así que el `state` CSRF de
 * Enable Banking vive en la tabla `oauth_states`, escrita/leída solo con la
 * clave de servicio.
 */
export async function createState(userId: string): Promise<string> {
  const value = randomValue()
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString()
  const { error } = await serviceClient().from('oauth_states').insert({ user_id: userId, value, expires_at: expiresAt })
  if (error) throw new Error(`No se pudo crear el estado OAuth: ${error.message}`)
  return value
}

export type ConsumeResult = { ok: true; userId: string } | { ok: false; reason: 'unknown' | 'expired' | 'used' }

/** Un solo uso: la segunda vez que se consume el mismo valor, falla. */
export async function consumeState(value: string): Promise<ConsumeResult> {
  const client = serviceClient()
  const { data, error } = await client.from('oauth_states').select('user_id, expires_at, consumed_at').eq('value', value).maybeSingle()
  if (error || !data) return { ok: false, reason: 'unknown' }
  if (data.consumed_at) return { ok: false, reason: 'used' }
  if (new Date(data.expires_at).getTime() < Date.now()) return { ok: false, reason: 'expired' }

  const { error: updateError } = await client
    .from('oauth_states')
    .update({ consumed_at: new Date().toISOString() })
    .eq('value', value)
    .is('consumed_at', null)
  if (updateError) return { ok: false, reason: 'used' }

  return { ok: true, userId: data.user_id }
}
