import { useEffect, useState } from 'react'
import { detectInternalTransferCandidates, type TransferCandidate } from '../../lib/internalTransfers'
import { supabase } from '../../lib/supabase/client'
import { useAuthStore } from '../../lib/supabase/useAuth'
import type { RealTransaction } from './useRealTransactions'

/** Clave estable de una pareja, para casarla con los descartes guardados. */
export function candidateKey(outgoingId: string, incomingId: string): string {
  return `${outgoingId}::${incomingId}`
}

interface DismissedResult {
  loading: boolean
  /** Claves `outgoingId::incomingId` que el usuario ya dijo que no son traspasos. */
  dismissed: Set<string>
  refetch: () => void
}

function useDismissedPairs(): DismissedResult {
  const session = useAuthStore((s) => s.session)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!supabase || !session) {
      setDismissed(new Set())
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)

    async function load() {
      if (!supabase) return
      const { data, error } = await supabase.from('internal_transfer_dismissals').select('outgoing_id, incoming_id').eq('active', true)
      if (cancelled) return
      if (error) console.error('useDismissedPairs: fallo al leer descartes', error)
      setDismissed(new Set((data ?? []).map((d) => candidateKey(d.outgoing_id as string, d.incoming_id as string))))
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [session, version])

  return { loading, dismissed, refetch: () => setVersion((v) => v + 1) }
}

interface InternalTransferCandidatesResult {
  loading: boolean
  /** Parejas propuestas y todavía sin resolver, las de más confianza primero. */
  candidates: TransferCandidate[]
  refetchDismissed: () => void
}

/**
 * Propone parejas de traspaso a partir de los movimientos ya cargados —
 * sin consulta extra de movimientos. Excluye los ya marcados como traspaso
 * y las parejas que el usuario ya descartó.
 */
export function useInternalTransferCandidates(
  transactions: RealTransaction[] | null,
  ownAccountNames: string[],
): InternalTransferCandidatesResult {
  const { loading, dismissed, refetch } = useDismissedPairs()

  if (loading || transactions === null) return { loading: true, candidates: [], refetchDismissed: refetch }

  const pending = transactions
    .filter((t) => !t.isInternalTransfer)
    .map((t) => ({
      id: t.id,
      accountId: t.accountId,
      dateISO: t.dateISO ?? '',
      amountCents: Math.round(t.importe * 100),
      description: t.comercio,
    }))
    .filter((t) => t.dateISO !== '')

  const candidates = detectInternalTransferCandidates(pending, ownAccountNames).filter(
    (c) => !dismissed.has(candidateKey(c.outgoing.id, c.incoming.id)),
  )

  return { loading: false, candidates, refetchDismissed: refetch }
}

/** Marca los dos lados de una pareja como traspaso entre cuentas propias. */
export async function confirmInternalTransfer(outgoingId: string, incomingId: string): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'
  const { error } = await supabase.from('transactions').update({ is_internal_transfer: true }).in('id', [outgoingId, incomingId])
  if (error) {
    console.error('confirmInternalTransfer: fallo al marcar', error)
    return 'No hemos podido marcarlo. Inténtalo de nuevo.'
  }
  return null
}

/** Guarda que esta pareja NO es un traspaso, para no volver a proponerla. */
export async function dismissInternalTransfer(outgoingId: string, incomingId: string): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 'Inicia sesión de nuevo.'

  const { error } = await supabase
    .from('internal_transfer_dismissals')
    .upsert({ user_id: user.id, outgoing_id: outgoingId, incoming_id: incomingId, active: true }, { onConflict: 'user_id,outgoing_id,incoming_id' })
  if (error) {
    console.error('dismissInternalTransfer: fallo al descartar', error)
    return 'No hemos podido descartarlo. Inténtalo de nuevo.'
  }
  return null
}
