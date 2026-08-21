import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { bearerToken, json, withCors } from '../_shared/http.ts'
import { resolveUserId, userClient } from '../_shared/supabaseClients.ts'

/**
 * Marca la conexión como desconectada. No borra nada (nunca se concede
 * DELETE en el esquema): las cuentas y movimientos ya guardados se quedan,
 * solo deja de sincronizarse.
 */
Deno.serve(
  withCors(async (req) => {
    if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

    const token = bearerToken(req)
    if (!token) return json(401, { error: 'unauthorized' })
    const userId = await resolveUserId(token)
    if (!userId) return json(401, { error: 'unauthorized' })

    const client = userClient(token)
    const { error } = await client
      .from('bank_connections')
      .update({ status: 'disconnected' })
      .eq('provider', 'enable_banking')
      .eq('status', 'connected')

    if (error) return json(500, { error: 'internal' })
    return json(200, { status: 'disconnected' })
  }),
)
