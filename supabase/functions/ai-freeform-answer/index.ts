import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const MODEL = 'claude-sonnet-5'
const MAX_QUESTION_LENGTH = 500
/** Techo de turnos previos que se reenvían — una conversación larga no debe crecer sin límite el coste de cada pregunta nueva. */
const MAX_HISTORY_TURNS = 10
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } })
}

function bearerToken(req: Request): string | null {
  const header = req.headers.get('Authorization')
  if (!header) return null
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match ? match[1] : null
}

async function resolveUserId(accessToken: string): Promise<string | null> {
  const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
  const { data, error } = await client.auth.getUser(accessToken)
  if (error || !data.user) return null
  return data.user.id
}

interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

type ClaudeResult = { text: string } | { error: string }

async function callClaude(system: string, userMessage: string, priorMessages: ClaudeMessage[]): Promise<ClaudeResult> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    console.error('callClaude: falta el secreto ANTHROPIC_API_KEY')
    return { error: 'missing_api_key' }
  }

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': ANTHROPIC_VERSION, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 600,
      system,
      messages: [...priorMessages, { role: 'user', content: userMessage }],
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    console.error('callClaude: fallo de la API de Anthropic', res.status, errText)
    return { error: 'anthropic_error' }
  }

  const data = await res.json()
  const text = (data.content?.[0]?.text as string | undefined) ?? ''
  return { text }
}

const SYSTEM_PROMPT =
  'Eres el asistente financiero de Áurea, una app de finanzas personales. Respondes SOLO preguntas sobre los ' +
  'datos financieros reales que se te dan a continuación, en JSON (importes en céntimos de euro salvo que se ' +
  'indique lo contrario). Nunca inventes una cifra que no esté en esos datos, ni la calcules a partir de ' +
  'supuestos que no puedas verificar con ellos. Si la pregunta no se puede responder con los datos disponibles, ' +
  'dilo explícitamente ("no tengo ese dato en Áurea todavía") en vez de estimarlo. No das recomendaciones de ' +
  'inversión reguladas ni recomiendas productos financieros concretos — puedes explicar cálculos y ' +
  'compensaciones. Responde en español, en un párrafo corto y directo, citando las cifras concretas que uses.'

/**
 * Responde una pregunta libre sobre las finanzas reales del usuario, con
 * memoria de los turnos anteriores de la misma conversación (los manda el
 * cliente en `history`; esta función no persiste nada). Todo en un solo
 * archivo, sin imports relativos a `_shared/` — el bundler de despliegue de
 * la herramienta MCP de Supabase no resolvía módulos relativos de forma
 * fiable al actualizar esta función en concreto (versiones anteriores sí
 * usaban `_shared/`), así que se duplica aquí lo mínimo que hacía falta.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  try {
    if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

    const token = bearerToken(req)
    if (!token) return json(401, { error: 'unauthorized' })
    const userId = await resolveUserId(token)
    if (!userId) return json(401, { error: 'unauthorized' })

    const body = await req.json().catch(() => null)
    const question = typeof body?.question === 'string' ? body.question.trim() : ''
    const snapshot = body?.snapshot
    const rawHistory = Array.isArray(body?.history) ? body.history : []

    if (!question || question.length > MAX_QUESTION_LENGTH) return json(400, { error: 'invalid_question' })
    if (!snapshot || typeof snapshot !== 'object') return json(400, { error: 'invalid_snapshot' })

    // Solo texto de turnos anteriores, nunca un snapshot ajeno o mal formado colado por el cliente.
    const priorMessages: ClaudeMessage[] = rawHistory
      .filter((t: unknown): t is { question: string; answer: string } => {
        const turn = t as { question?: unknown; answer?: unknown }
        return typeof turn?.question === 'string' && typeof turn?.answer === 'string'
      })
      .slice(-MAX_HISTORY_TURNS)
      .flatMap((t: { question: string; answer: string }) => [
        { role: 'user' as const, content: t.question },
        { role: 'assistant' as const, content: t.answer },
      ])

    const userMessage = `Datos financieros reales del usuario (pueden haber cambiado desde el turno anterior, usa siempre estos):\n${JSON.stringify(snapshot, null, 2)}\n\nPregunta: ${question}`

    const result = await callClaude(SYSTEM_PROMPT, userMessage, priorMessages)
    if ('error' in result) return json(502, { error: result.error })

    return json(200, { answer: result.text })
  } catch (err) {
    console.error(err)
    return json(500, { error: 'internal' })
  }
})
