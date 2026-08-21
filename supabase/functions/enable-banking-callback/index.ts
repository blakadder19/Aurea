import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { getCredentials } from '../_shared/config.ts'
import { createSession } from '../_shared/enableBanking.ts'
import { bearerToken, json, withCors } from '../_shared/http.ts'
import { mintRequestToken } from '../_shared/jwt.ts'
import { consumeState } from '../_shared/oauthState.ts'
import { collectAndPersist } from '../_shared/persistFlow.ts'
import { resolveUserId, userClient } from '../_shared/supabaseClients.ts'

interface CallbackBody {
  code?: string
  state?: string
  error?: string
}

/**
 * Recibe `code`+`state` de la redirección de Enable Banking, crea la sesión y
 * persiste el histórico completo de una vez (alta inicial). Requiere que
 * quien llama sea el mismo usuario que inició el flujo en `connect`.
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

    const body = (await req.json().catch(() => ({}))) as CallbackBody
    if (body.error) return json(400, { error: 'authorization_failed' })
    if (!body.code || !body.state) return json(400, { error: 'missing_parameters' })

    const consumed = await consumeState(body.state)
    if (!consumed.ok) return json(400, { error: 'invalid_state', reason: consumed.reason })
    if (consumed.userId !== userId) return json(400, { error: 'state_user_mismatch' })

    const getToken = () => mintRequestToken(creds)
    const session = await createSession(getToken, body.code)

    const result = await collectAndPersist({
      creds,
      client: userClient(token),
      userId,
      sessionId: session.session_id,
      accountUids: session.accounts,
      aspspName: session.aspsp?.name ?? '',
      aspspCountry: session.aspsp?.country ?? '',
    })

    if (result.status === 'needs_reconnect') return json(200, { status: 'needs_reconnect' })
    return json(200, { status: 'connected', ...result })
  }),
)
