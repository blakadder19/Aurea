import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { bearerToken, json, withCors } from '../_shared/http.ts'
import { resolveUserId } from '../_shared/supabaseClients.ts'
import { callClaude } from '../_shared/anthropic.ts'

const MODEL = 'claude-sonnet-5'
const MAX_QUESTION_LENGTH = 500

const SYSTEM_PROMPT =
  'Eres el asistente financiero de Áurea, una app de finanzas personales. Respondes SOLO preguntas sobre los ' +
  'datos financieros reales que se te dan a continuación, en JSON (importes en céntimos de euro salvo que se ' +
  'indique lo contrario). Nunca inventes una cifra que no esté en esos datos, ni la calcules a partir de ' +
  'supuestos que no puedas verificar con ellos. Si la pregunta no se puede responder con los datos disponibles, ' +
  'dilo explícitamente ("no tengo ese dato en Áurea todavía") en vez de estimarlo. No das recomendaciones de ' +
  'inversión reguladas ni recomiendas productos financieros concretos — puedes explicar cálculos y ' +
  'compensaciones. Responde en español, en un párrafo corto y directo, citando las cifras concretas que uses.'

/**
 * Responde una pregunta libre sobre las finanzas reales del usuario. El
 * snapshot de datos lo calcula el cliente (mismas funciones puras que usan
 * Inicio/Presupuesto/Objetivos/Deudas) y se lo pasa entero — esta función
 * nunca consulta la base de datos por su cuenta, solo hace de intermediaria
 * con el modelo, para no duplicar lógica de cálculo en dos sitios distintos.
 */
Deno.serve(
  withCors(async (req) => {
    if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

    const token = bearerToken(req)
    if (!token) return json(401, { error: 'unauthorized' })
    const userId = await resolveUserId(token)
    if (!userId) return json(401, { error: 'unauthorized' })

    const body = await req.json().catch(() => null)
    const question = typeof body?.question === 'string' ? body.question.trim() : ''
    const snapshot = body?.snapshot

    if (!question || question.length > MAX_QUESTION_LENGTH) return json(400, { error: 'invalid_question' })
    if (!snapshot || typeof snapshot !== 'object') return json(400, { error: 'invalid_snapshot' })

    const userMessage = `Datos financieros reales del usuario:\n${JSON.stringify(snapshot, null, 2)}\n\nPregunta: ${question}`

    const result = await callClaude(MODEL, SYSTEM_PROMPT, userMessage, 600)
    if ('error' in result) return json(502, { error: result.error })

    return json(200, { answer: result.text })
  }),
)
