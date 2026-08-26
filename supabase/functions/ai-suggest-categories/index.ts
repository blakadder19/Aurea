import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { bearerToken, json, withCors } from '../_shared/http.ts'
import { resolveUserId, userClient } from '../_shared/supabaseClients.ts'
import { callClaude } from '../_shared/anthropic.ts'

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TRANSACTIONS = 30

interface RawSuggestion {
  transaction_id?: unknown
  category_id?: unknown
  confidence?: unknown
}

/**
 * Sugiere una categoría (de las que el usuario ya tiene, nunca una nueva)
 * para sus movimientos sin clasificar más recientes. Nunca escribe nada:
 * devuelve sugerencias para que el cliente las muestre y el usuario decida
 * aceptarlas o no, igual que "Crear regla" — la IA propone, nunca decide.
 */
Deno.serve(
  withCors(async (req) => {
    if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

    const token = bearerToken(req)
    if (!token) return json(401, { error: 'unauthorized' })
    const userId = await resolveUserId(token)
    if (!userId) return json(401, { error: 'unauthorized' })

    const client = userClient(token)

    const [{ data: categories, error: catError }, { data: transactions, error: txError }] = await Promise.all([
      client.from('categories').select('id, name'),
      client
        .from('transactions')
        .select('id, description, amount_cents')
        .is('category_id', null)
        .eq('is_internal_transfer', false)
        .order('booking_date', { ascending: false })
        .limit(MAX_TRANSACTIONS),
    ])
    if (catError || txError) return json(500, { error: 'db_error' })
    if (!categories?.length || !transactions?.length) return json(200, { suggestions: [] })

    const categoryList = categories.map((c) => `${c.id}: ${c.name}`).join('\n')
    const txList = transactions.map((t) => `${t.id} | ${(t.description as string | null) ?? 'Sin descripción'} | ${((t.amount_cents as number) / 100).toFixed(2)} €`).join('\n')

    const system =
      'Eres un clasificador de movimientos bancarios personales. Tu única tarea es asignar, a cada movimiento, ' +
      'EXACTAMENTE uno de los ids de categoría de la lista dada — nunca inventes un id ni un nombre de categoría ' +
      'que no esté en la lista. Si tienes una intuición razonable pero no estás del todo seguro, inclúyelo igual ' +
      'marcando "confidence": "baja" en vez de omitirlo — solo omite un movimiento si de verdad no tienes ninguna ' +
      'pista (p. ej. descripción vacía o totalmente ambigua). Responde solo con JSON válido: un array de objetos ' +
      '{"transaction_id": "...", "category_id": "...", "confidence": "alta"|"baja"}, sin texto adicional ni bloque de código.'

    const userMessage = `Categorías disponibles (id: nombre):\n${categoryList}\n\nMovimientos a clasificar (id | descripción | importe):\n${txList}`

    const result = await callClaude(MODEL, system, userMessage, 2048)
    if ('error' in result) return json(502, { error: result.error })

    let parsed: RawSuggestion[]
    try {
      const cleaned = result.text.trim().replace(/^```(json)?\n?/, '').replace(/```$/, '')
      parsed = JSON.parse(cleaned)
      if (!Array.isArray(parsed)) throw new Error('not_array')
    } catch {
      console.error('ai-suggest-categories: respuesta no era JSON válido', result.text)
      return json(502, { error: 'invalid_ai_response' })
    }

    // Nunca nos fiamos de lo que devuelve el modelo a ciegas: solo pasan las
    // sugerencias cuyo transaction_id y category_id son de verdad del usuario.
    const validCategoryIds = new Set(categories.map((c) => c.id as string))
    const validTxIds = new Set(transactions.map((t) => t.id as string))
    const suggestions = parsed
      .filter(
        (s): s is { transaction_id: string; category_id: string; confidence?: unknown } =>
          typeof s.transaction_id === 'string' &&
          typeof s.category_id === 'string' &&
          validTxIds.has(s.transaction_id) &&
          validCategoryIds.has(s.category_id),
      )
      .map((s) => ({
        transaction_id: s.transaction_id,
        category_id: s.category_id,
        confidence: s.confidence === 'baja' ? 'baja' : 'alta',
      }))

    return json(200, { suggestions })
  }),
)
