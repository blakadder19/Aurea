import { supabase } from '../../lib/supabase/client'

const MAX_RECEIPT_BYTES = 8 * 1024 * 1024

/**
 * Sube una foto de recibo al bucket privado `receipts`, bajo
 * `<user_id>/<...>` — las políticas de storage.objects solo dejan leer,
 * escribir o borrar rutas que empiecen por el propio uid. Guarda la ruta
 * en transactions.receipt_path; nunca genera una URL pública.
 */
export async function uploadTransactionReceipt(transactionId: string, file: File): Promise<{ path: string | null; error: string | null }> {
  if (!supabase) return { path: null, error: 'Supabase no está configurado.' }
  if (!file.type.startsWith('image/')) return { path: null, error: 'Solo se admiten imágenes.' }
  if (file.size > MAX_RECEIPT_BYTES) return { path: null, error: 'La imagen pesa demasiado (máximo 8 MB).' }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { path: null, error: 'Inicia sesión de nuevo.' }

  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg'
  const path = `${user.id}/${transactionId}-${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage.from('receipts').upload(path, file, { contentType: file.type })
  if (uploadError) {
    console.error('uploadTransactionReceipt: fallo al subir', uploadError)
    return { path: null, error: 'No hemos podido subir la imagen. Inténtalo de nuevo.' }
  }

  const { error: updateError } = await supabase.from('transactions').update({ receipt_path: path }).eq('id', transactionId)
  if (updateError) {
    console.error('uploadTransactionReceipt: fallo al guardar la ruta', updateError)
    await supabase.storage.from('receipts').remove([path])
    return { path: null, error: 'No hemos podido guardar el recibo. Inténtalo de nuevo.' }
  }

  return { path, error: null }
}

/** Quita el recibo de un movimiento: borra el archivo del storage y limpia la ruta guardada. */
export async function removeTransactionReceipt(transactionId: string, path: string): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'

  const { error: updateError } = await supabase.from('transactions').update({ receipt_path: null }).eq('id', transactionId)
  if (updateError) {
    console.error('removeTransactionReceipt: fallo al limpiar la ruta', updateError)
    return 'No hemos podido quitar el recibo. Inténtalo de nuevo.'
  }

  const { error: removeError } = await supabase.storage.from('receipts').remove([path])
  if (removeError) console.error('removeTransactionReceipt: fallo al borrar el archivo', removeError)

  return null
}

/** URL firmada de corta duración para previsualizar el recibo — nunca una URL pública. */
export async function fetchReceiptSignedUrl(path: string): Promise<string | null> {
  if (!supabase) return null
  const { data, error } = await supabase.storage.from('receipts').createSignedUrl(path, 60)
  if (error || !data) {
    console.error('fetchReceiptSignedUrl: fallo al firmar', error)
    return null
  }
  return data.signedUrl
}
