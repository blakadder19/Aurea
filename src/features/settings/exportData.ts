import { supabase } from '../../lib/supabase/client'

function toCsvValue(v: unknown): string {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((row) => row.map(toCsvValue).join(',')).join('\n')
}

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const todayForFilename = () => new Date().toISOString().slice(0, 10)

/** Descarga todos tus movimientos reales a CSV — fecha, comercio, cuenta, categoría, importe, nota, etiquetas. */
export async function exportTransactionsCsv(): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'

  const [{ data: transactions, error: txError }, { data: accounts }, { data: categories }, { data: tagRows }] = await Promise.all([
    supabase
      .from('transactions')
      .select('id, booking_date, value_date, description, amount_cents, account_id, category_id, user_note')
      .order('booking_date', { ascending: false }),
    supabase.from('accounts').select('id, name, display_name, product'),
    supabase.from('categories').select('id, name'),
    supabase.from('transaction_tags').select('transaction_id, tags (name)'),
  ])
  if (txError || !transactions) {
    console.error('exportTransactionsCsv: fallo al leer transactions', txError)
    return 'No hemos podido exportar tus movimientos. Inténtalo de nuevo.'
  }
  if (transactions.length === 0) return 'Todavía no tienes movimientos que exportar.'

  const accountNameById = new Map(
    (accounts ?? []).map((a) => [
      a.id as string,
      (a.display_name as string | null) || (a.name as string | null) || (a.product as string | null) || 'Cuenta',
    ]),
  )
  const categoryNameById = new Map((categories ?? []).map((c) => [c.id as string, c.name as string]))

  // Las etiquetas viven en su propia tabla desde el 21 sep 2026, no en un
  // text[] de cada movimiento.
  const tagNamesByTransaction = new Map<string, string[]>()
  for (const row of (tagRows ?? []) as unknown as { transaction_id: string; tags: { name: string } | { name: string }[] | null }[]) {
    const embedded = Array.isArray(row.tags) ? row.tags : row.tags ? [row.tags] : []
    const list = tagNamesByTransaction.get(row.transaction_id) ?? []
    for (const tag of embedded) list.push(tag.name)
    tagNamesByTransaction.set(row.transaction_id, list)
  }

  const rows = transactions.map((t) => [
    (t.booking_date as string | null) ?? (t.value_date as string | null) ?? '',
    (t.description as string | null) ?? '',
    accountNameById.get(t.account_id as string) ?? '',
    t.category_id ? (categoryNameById.get(t.category_id as string) ?? 'Sin clasificar') : 'Sin clasificar',
    ((t.amount_cents as number) / 100).toFixed(2),
    (t.user_note as string | null) ?? '',
    (tagNamesByTransaction.get(t.id as string) ?? []).sort((a, b) => a.localeCompare(b, 'es')).join('; '),
  ])

  downloadFile(`aurea-movimientos-${todayForFilename()}.csv`, toCsv(['Fecha', 'Comercio', 'Cuenta', 'Categoría', 'Importe', 'Nota', 'Etiquetas'], rows), 'text/csv;charset=utf-8;')
  return null
}

/**
 * Descarga una copia completa de tus datos reales en JSON — cuentas,
 * movimientos, categorías, presupuestos, objetivos y deudas. Sin
 * transformar ni resumir nada: exactamente lo que hay guardado, para que
 * puedas llevártelo a otra herramienta o guardarlo como copia de seguridad.
 */
export async function exportAllDataJson(): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'

  const [accounts, transactions, categories, budgets, goals, debtDetails, investments, tags, transactionTags] = await Promise.all([
    supabase.from('accounts').select('*'),
    supabase.from('transactions').select('*'),
    supabase.from('categories').select('*'),
    supabase.from('budgets').select('*'),
    supabase.from('goals').select('*'),
    supabase.from('debt_details').select('*'),
    supabase.from('investments').select('*'),
    supabase.from('tags').select('*'),
    supabase.from('transaction_tags').select('*'),
  ])

  const failed = [accounts, transactions, categories, budgets, goals, debtDetails, investments, tags, transactionTags].find((r) => r.error)
  if (failed) {
    console.error('exportAllDataJson: fallo al leer datos', failed.error)
    return 'No hemos podido exportar tus datos. Inténtalo de nuevo.'
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    accounts: accounts.data,
    transactions: transactions.data,
    categories: categories.data,
    budgets: budgets.data,
    goals: goals.data,
    debtDetails: debtDetails.data,
    investments: investments.data,
    tags: tags.data,
    transactionTags: transactionTags.data,
  }

  downloadFile(`aurea-datos-${todayForFilename()}.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8;')
  return null
}
