import { EB_API_BASE } from './config.ts'
import type { EbAccountDetails, EbBalance, EbTransaction } from './normalize.ts'

/**
 * Cliente HTTP de Enable Banking, estrictamente de solo lectura (AIS).
 * No existe ni se invoca ningún endpoint de pagos.
 * Portado de blakadder19/Aurea---Finanzas (server/enableBanking.ts), sin
 * cambios de lógica — solo el runtime (Deno en vez de Node).
 */

export type TokenProvider = () => Promise<string>

export interface Aspsp {
  name: string
  country: string
  [k: string]: unknown
}

export interface EbSession {
  session_id: string
  accounts: string[]
  status?: string
  aspsp?: Aspsp
}

export class EbApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | undefined,
    public readonly path: string,
  ) {
    super(`Enable Banking respondió ${status} en ${path}`)
    this.name = 'EbApiError'
  }
}

async function ebFetch<T>(
  path: string,
  opts: { method?: string; body?: unknown; getToken: TokenProvider; query?: Record<string, string | undefined> },
): Promise<T> {
  const token = await opts.getToken()
  const url = new URL(path, EB_API_BASE)
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v != null && v !== '') url.searchParams.set(k, v)
    }
  }

  const res = await fetch(url, {
    method: opts.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: opts.body != null ? JSON.stringify(opts.body) : undefined,
  })

  if (!res.ok) {
    let code: string | undefined
    try {
      const data = (await res.json()) as { code?: string; error?: string }
      const raw = data.code || data.error
      if (typeof raw === 'string' && raw.length <= 64) code = raw
    } catch {
      /* cuerpo no-JSON: se ignora para no filtrar datos */
    }
    throw new EbApiError(res.status, code, path)
  }

  return (await res.json()) as T
}

export async function listAspsps(getToken: TokenProvider): Promise<Aspsp[]> {
  const data = await ebFetch<{ aspsps: Aspsp[] }>('/aspsps', { getToken })
  return data.aspsps ?? []
}

export function findAspsp(aspsps: Aspsp[], name: string, country: string): Aspsp {
  const wanted = name.toLowerCase()
  const matches = aspsps.filter(
    (a) => a.country?.toUpperCase() === country.toUpperCase() && a.name?.toLowerCase().includes(wanted),
  )
  if (matches.length === 0) throw new Error(`No se encontró ${name} para ${country}`)
  if (matches.length > 1) {
    const exact = matches.filter((a) => a.name?.toLowerCase() === wanted)
    if (exact.length === 1) return exact[0]
    throw new Error(`Coincidencia ambigua de ${name} para ${country}`)
  }
  return matches[0]
}

export interface StartAuthParams {
  getToken: TokenProvider
  aspsp: { name: string; country: string }
  state: string
  redirectUrl: string
  validUntil: string
  psuType: string
}

export async function startAuth(params: StartAuthParams): Promise<{ url: string }> {
  return ebFetch<{ url: string }>('/auth', {
    method: 'POST',
    getToken: params.getToken,
    body: {
      access: { valid_until: params.validUntil },
      aspsp: { name: params.aspsp.name, country: params.aspsp.country },
      state: params.state,
      redirect_url: params.redirectUrl,
      psu_type: params.psuType,
    },
  })
}

export async function createSession(getToken: TokenProvider, code: string): Promise<EbSession> {
  const data = await ebFetch<EbSession & { accounts: unknown[] }>('/sessions', {
    method: 'POST',
    getToken,
    body: { code },
  })
  return { ...data, accounts: normalizeAccountUids(data.accounts) }
}

export async function getSession(getToken: TokenProvider, sessionId: string): Promise<EbSession> {
  const data = await ebFetch<EbSession & { accounts: unknown[] }>(`/sessions/${encodeURIComponent(sessionId)}`, {
    getToken,
  })
  return { ...data, accounts: normalizeAccountUids(data.accounts) }
}

function normalizeAccountUids(accounts: unknown[]): string[] {
  if (!Array.isArray(accounts)) return []
  return accounts
    .map((a) => (typeof a === 'string' ? a : (a as { uid?: string })?.uid))
    .filter((x): x is string => typeof x === 'string' && x.length > 0)
}

export async function getAccountDetails(getToken: TokenProvider, uid: string): Promise<EbAccountDetails> {
  const data = await ebFetch<EbAccountDetails>(`/accounts/${encodeURIComponent(uid)}/details`, { getToken })
  return { ...data, uid: data.uid ?? uid }
}

export async function getAccountBalances(getToken: TokenProvider, uid: string): Promise<EbBalance[]> {
  const data = await ebFetch<{ balances: EbBalance[] }>(`/accounts/${encodeURIComponent(uid)}/balances`, {
    getToken,
  })
  return data.balances ?? []
}

const MAX_TRANSACTION_PAGES = 50

export async function getAccountTransactions(
  getToken: TokenProvider,
  uid: string,
  dateFrom: string,
): Promise<EbTransaction[]> {
  const all: EbTransaction[] = []
  let continuationKey: string | undefined
  let pages = 0

  do {
    const data: { transactions?: EbTransaction[]; continuation_key?: string } = await ebFetch(
      `/accounts/${encodeURIComponent(uid)}/transactions`,
      { getToken, query: { date_from: dateFrom, continuation_key: continuationKey } },
    )
    if (data.transactions?.length) all.push(...data.transactions)
    continuationKey = data.continuation_key
    pages += 1
  } while (continuationKey && pages < MAX_TRANSACTION_PAGES)

  return all
}
