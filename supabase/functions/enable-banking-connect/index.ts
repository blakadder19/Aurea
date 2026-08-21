import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { ASPSP_COUNTRY, ASPSP_NAME, PSU_TYPE, REDIRECT_URL, getCredentials } from '../_shared/config.ts'
import { findAspsp, listAspsps, startAuth } from '../_shared/enableBanking.ts'
import { bearerToken, json, withCors } from '../_shared/http.ts'
import { mintRequestToken } from '../_shared/jwt.ts'
import { createState } from '../_shared/oauthState.ts'
import { consentValidUntil } from '../_shared/sync.ts'
import { resolveUserId } from '../_shared/supabaseClients.ts'

/** Arranca el flujo de autorización de Enable Banking. Requiere sesión de usuario. */
Deno.serve(
  withCors(async (req) => {
    if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

    const token = bearerToken(req)
    if (!token) return json(401, { error: 'unauthorized' })
    const userId = await resolveUserId(token)
    if (!userId) return json(401, { error: 'unauthorized' })

    const creds = getCredentials()
    if (!creds) return json(503, { error: 'not_configured' })
    if (!REDIRECT_URL) return json(503, { error: 'redirect_url_not_configured' })

    const getToken = () => mintRequestToken(creds)
    const aspsps = await listAspsps(getToken)
    const aspsp = findAspsp(aspsps, ASPSP_NAME, ASPSP_COUNTRY)

    const state = await createState(userId)
    const { url } = await startAuth({
      getToken,
      aspsp: { name: aspsp.name, country: aspsp.country },
      state,
      redirectUrl: REDIRECT_URL,
      validUntil: consentValidUntil(),
      psuType: PSU_TYPE,
    })

    return json(200, { authUrl: url })
  }),
)
