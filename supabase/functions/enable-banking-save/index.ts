import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { getCredentials } from '../_shared/config.ts'
import { bearerToken, json, withCors } from '../_shared/http.ts'
import { collectAndPersist } from '../_shared/persistFlow.ts'
import { resolveUserId, userClient } from '../_shared/supabaseClients.ts'

/**
 * Resincroniza una conexión ya existente (sin pasar por el flujo OAuth de
 * nuevo): relee el histórico completo y lo persiste — idempotente, así que
 * sirve tanto para el alta programada como para un botón "Sincronizar ahora".
 */
Deno.serve(
  withCors(async (req) => {
    if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

    const token = bearerToken(req)
    if (!token) return json(401, { error: 'unauthorized' })
    const userId = await resolveUserId(token)
    if (!userId) return json(401, { error: 'unauthorized' })

    const creds = getCredentials()
    if (!creds) return json(503, { error: 'not_configured' })

    const client = userClient(token)
    const { data: connection, error } = await client
      .from('bank_connections')
      .select('eb_session_id, eb_account_uids, aspsp_name, aspsp_country, status')
      .eq('provider', 'enable_banking')
      .eq('status', 'connected')
      .maybeSingle()

    if (error || !connection || !connection.eb_session_id) return json(409, { error: 'not_connected' })

    const result = await collectAndPersist({
      creds,
      client,
      userId,
      sessionId: connection.eb_session_id as string,
      accountUids: (connection.eb_account_uids as string[]) ?? [],
      aspspName: connection.aspsp_name as string,
      aspspCountry: connection.aspsp_country as string,
    })

    if (result.status === 'needs_reconnect') return json(200, { status: 'needs_reconnect' })
    return json(200, { status: 'saved', ...result })
  }),
)
