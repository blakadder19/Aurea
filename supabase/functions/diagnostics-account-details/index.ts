import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { EB_API_BASE, getCredentials } from '../_shared/config.ts'
import { bearerToken, json, withCors } from '../_shared/http.ts'
import { mintRequestToken } from '../_shared/jwt.ts'
import { resolveUserId, userClient } from '../_shared/supabaseClients.ts'

/**
 * DIAGNÓSTICO TEMPORAL — no forma parte del producto.
 * Devuelve el JSON crudo (sin filtrar por nuestro AccountPreview) que Enable
 * Banking da en /accounts/{uid}/details para cada cuenta del usuario que
 * llama, para ver si hay algún campo (cash_account_type, usage, etc.) que
 * distinga un Pocket de Revolut de una cuenta normal. Solo lectura (AIS),
 * y solo sobre las propias cuentas del usuario autenticado (RLS).
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
    const { data: accounts, error } = await client
      .from('accounts')
      .select('id, name, external_account_id, currency')
    if (error) return json(500, { error: 'db_error' })

    const ebToken = await mintRequestToken(creds)
    const results = []
    for (const a of accounts ?? []) {
      const res = await fetch(`${EB_API_BASE}/accounts/${encodeURIComponent(a.external_account_id as string)}/details`, {
        headers: { Authorization: `Bearer ${ebToken}`, Accept: 'application/json' },
      })
      const raw = await res.json().catch(() => null)
      results.push({ accountId: a.id, currency: a.currency, status: res.status, raw })
    }

    return json(200, { results })
  }),
)
