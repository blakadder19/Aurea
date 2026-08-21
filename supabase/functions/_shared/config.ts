/**
 * Configuración de las Edge Functions de Enable Banking. Todo llega por
 * secretos de Supabase (`Deno.env`) — nunca por fichero en disco, porque una
 * Edge Function no tiene almacenamiento persistente entre invocaciones.
 *
 * SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase
 * automáticamente en todo Edge Function; no hace falta configurarlos.
 */

export const EB_API_BASE = Deno.env.get('ENABLE_BANKING_API_BASE') ?? 'https://api.enablebanking.com'
export const ASPSP_NAME = Deno.env.get('ENABLE_BANKING_ASPSP_NAME') ?? 'Revolut'
export const ASPSP_COUNTRY = Deno.env.get('ENABLE_BANKING_ASPSP_COUNTRY') ?? 'IE'
export const PSU_TYPE = 'personal'
export const CONSENT_DAYS = Number(Deno.env.get('ENABLE_BANKING_CONSENT_DAYS') ?? '89')
export const REDIRECT_URL = Deno.env.get('ENABLE_BANKING_REDIRECT_URL') ?? ''

export const INITIAL_TRANSACTION_WINDOW_DAYS = 90
export const SYNC_OVERLAP_DAYS = 7

export interface Credentials {
  appId: string
  privateKeyPem: string
}

/** null si faltan credenciales — igual que `hasCredentials()` en Finanzas. */
export function getCredentials(): Credentials | null {
  const appId = (Deno.env.get('ENABLE_BANKING_APP_ID') ?? '').trim()
  const privateKeyPem = (Deno.env.get('ENABLE_BANKING_PRIVATE_KEY') ?? '').trim()
  if (!appId || !privateKeyPem) return null
  return { appId, privateKeyPem }
}

export const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
export const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
export const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
