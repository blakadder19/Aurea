import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase/client'
import { useAuthStore } from '../../lib/supabase/useAuth'

/** Dinero que alguien le debe al usuario — lo contrario de una deuda propia (esas viven en debt_details). */
export interface Receivable {
  id: string
  name: string
  amountCents: number
  settled: boolean
}

interface RealReceivablesResult {
  loading: boolean
  /** null mientras carga o si no hay sesión — no confundir con "cero deudas pendientes". */
  receivables: Receivable[] | null
  refetch: () => void
}

/** Deudas que le deben al usuario, no saldadas. Las saldadas no se muestran, pero no se borran (createReceivable/settleReceivable son reversibles). */
export function useRealReceivables(): RealReceivablesResult {
  const session = useAuthStore((s) => s.session)
  const [loading, setLoading] = useState(true)
  const [receivables, setReceivables] = useState<Receivable[] | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!supabase || !session) {
      setReceivables(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    async function load() {
      if (!supabase) return
      const { data, error } = await supabase
        .from('receivables')
        .select('id, name, amount_cents, settled')
        .eq('settled', false)
        .order('created_at', { ascending: true })
      if (cancelled) return
      if (error || !data) {
        console.error('useRealReceivables: fallo al leer receivables', error)
        setReceivables([])
        setLoading(false)
        return
      }

      setReceivables(
        data.map((row) => ({
          id: row.id as string,
          name: row.name as string,
          amountCents: row.amount_cents as number,
          settled: Boolean(row.settled),
        })),
      )
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [session, version])

  return { loading, receivables, refetch: () => setVersion((v) => v + 1) }
}

/** Crea una deuda que le deben al usuario. RLS asegura que solo puede crear las suyas. */
export async function createReceivable(name: string, amountCents: number): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'
  if (!name.trim()) return 'Di quién te debe el dinero.'
  if (!Number.isInteger(amountCents) || amountCents <= 0) return 'El importe debe ser mayor que 0.'

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 'Inicia sesión de nuevo.'

  const { error } = await supabase.from('receivables').insert({ user_id: user.id, name: name.trim(), amount_cents: amountCents })
  if (error) {
    console.error('createReceivable: fallo al crear', error)
    return 'No hemos podido guardarlo. Inténtalo de nuevo.'
  }
  return null
}

/** Marca una deuda como cobrada. Reversible: ver unsettleReceivable. */
export async function settleReceivable(id: string): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'
  const { error } = await supabase.from('receivables').update({ settled: true }).eq('id', id)
  if (error) {
    console.error('settleReceivable: fallo al marcar como cobrada', error)
    return 'No hemos podido guardar el cambio. Inténtalo de nuevo.'
  }
  return null
}

/** Deshace un "marcar como cobrada". */
export async function unsettleReceivable(id: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('receivables').update({ settled: false }).eq('id', id)
  if (error) console.error('unsettleReceivable: fallo al deshacer', error)
}
