import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase/client'
import { useAuthStore } from '../../lib/supabase/useAuth'

export interface RealConnection {
  id: string
  institution: string
  country: string
  status: 'connected' | 'disconnected'
  connectedAt: string
  lastSyncedAt: string | null
}

interface RealConnectionsResult {
  loading: boolean
  /** null mientras carga o si no hay sesión — no confundir con "cero conexiones". */
  connections: RealConnection[] | null
  refetch: () => void
}

/** La conexión bancaria real más reciente sincronizada, o null si ninguna se ha sincronizado nunca. */
export function latestSync(connections: RealConnection[]): string | null {
  const synced = connections.map((c) => c.lastSyncedAt).filter((d): d is string => d !== null)
  if (synced.length === 0) return null
  return synced.reduce((latest, d) => (d > latest ? d : latest))
}

/** Conexiones bancarias reales (Enable Banking) del usuario, gestionadas desde Cuentas y patrimonio y desde aquí. */
export function useRealConnections(): RealConnectionsResult {
  const session = useAuthStore((s) => s.session)
  const [loading, setLoading] = useState(true)
  const [connections, setConnections] = useState<RealConnection[] | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!supabase || !session) {
      setConnections(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    async function load() {
      if (!supabase) return
      const { data, error } = await supabase
        .from('bank_connections')
        .select('id, aspsp_name, aspsp_country, status, connected_at, last_synced_at')
        .order('connected_at', { ascending: false })
      if (cancelled) return
      if (error || !data) {
        console.error('useRealConnections: fallo al leer bank_connections', error)
        setConnections([])
        setLoading(false)
        return
      }

      setConnections(
        data.map((row) => ({
          id: row.id as string,
          institution: row.aspsp_name as string,
          country: row.aspsp_country as string,
          status: row.status as 'connected' | 'disconnected',
          connectedAt: row.connected_at as string,
          lastSyncedAt: row.last_synced_at as string | null,
        })),
      )
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [session, version])

  return { loading, connections, refetch: () => setVersion((v) => v + 1) }
}
