/**
 * Cliente mínimo de la API de Anthropic — solo lo que necesitan las Edge
 * Functions de IA de Áurea (una llamada de texto, sin streaming, sin
 * herramientas). La clave vive como secreto de Supabase (ANTHROPIC_API_KEY),
 * nunca en el código ni en el cliente.
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

export type ClaudeResult = { text: string } | { error: string }

export async function callClaude(model: string, system: string, userMessage: string, maxTokens = 1024): Promise<ClaudeResult> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    console.error('callClaude: falta el secreto ANTHROPIC_API_KEY')
    return { error: 'missing_api_key' }
  }

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMessage }],
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
