import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import type { Credentials } from './config.ts'
import { mintRequestToken } from './jwt.ts'
import { persistCollected, type PersistResult } from './persistence.ts'
import { collectRealData, fullHistoryWindowStart } from './sync.ts'

export type CollectAndPersistResult = { status: 'needs_reconnect' } | ({ status: 'ok' } & PersistResult)

interface Params {
  creds: Credentials
  client: SupabaseClient
  userId: string
  sessionId: string
  accountUids: string[]
  aspspName: string
  aspspCountry: string
}

/**
 * Orquesta recolectar (Enable Banking) + persistir (Supabase, bajo RLS del
 * propio usuario) el histórico completo (90 días). La reutilizan tanto el
 * alta inicial (`callback`) como una resincronización posterior (`save`) —
 * ambas hacen exactamente lo mismo, la única diferencia es de dónde sale la
 * sesión de Enable Banking (recién creada vs. ya guardada).
 */
export async function collectAndPersist(params: Params): Promise<CollectAndPersistResult> {
  const getToken = () => mintRequestToken(params.creds)
  const windowFrom = fullHistoryWindowStart()

  const collected = await collectRealData(
    params.creds,
    getToken,
    { sessionId: params.sessionId, accountUids: params.accountUids },
    windowFrom,
  )
  if (collected.status === 'needs_reconnect') return { status: 'needs_reconnect' }

  const result = await persistCollected({
    client: params.client,
    userId: params.userId,
    aspspName: collected.data.aspspName ?? params.aspspName,
    aspspCountry: collected.data.aspspCountry ?? params.aspspCountry,
    sessionId: params.sessionId,
    accountUids: params.accountUids,
    windowFrom,
    accounts: collected.data.accounts,
  })

  return { status: 'ok', ...result }
}
