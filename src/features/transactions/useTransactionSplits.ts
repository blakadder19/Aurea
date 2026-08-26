import { supabase } from '../../lib/supabase/client'

export interface TransactionSplit {
  categoryId: string
  amountCents: number
}

/** Lee las categorías en que está dividido un movimiento — vacío si no está dividido. */
export async function fetchTransactionSplits(transactionId: string): Promise<TransactionSplit[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('transaction_splits').select('category_id, amount_cents').eq('transaction_id', transactionId)
  if (error) {
    console.error('fetchTransactionSplits: fallo al leer', error)
    return []
  }
  return (data ?? []).map((r) => ({ categoryId: r.category_id as string, amountCents: r.amount_cents as number }))
}

/**
 * Sustituye de golpe la división de un movimiento — pasar un array vacío lo
 * deja sin dividir (vuelve a su categoría única). Atómico vía la función
 * `replace_transaction_splits`: borra y vuelve a insertar dentro de la misma
 * transacción de Postgres, y comprueba que la suma cuadre con el importe
 * del movimiento antes de confirmar — si no cuadra, no se guarda nada.
 */
export async function saveTransactionSplits(transactionId: string, splits: TransactionSplit[]): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'
  const { error } = await supabase.rpc('replace_transaction_splits', {
    p_transaction_id: transactionId,
    p_splits: splits.map((s) => ({ category_id: s.categoryId, amount_cents: s.amountCents })),
  })
  if (error) {
    console.error('saveTransactionSplits: fallo al guardar', error)
    return 'Las categorías deben sumar el importe total del movimiento.'
  }
  return null
}
