import { useState } from 'react'
import { Badge } from '../../components/Badge'
import { Card } from '../../components/Card'
import { formatIsoDateTime } from '../../lib/format'
import { disconnectBank, startBankConnection } from './bankConnection'
import { useRealConnections } from './useRealConnections'

/** Tu conexión bancaria real (Enable Banking): estado, última sincronización, y conectar/desconectar. */
export function RealConnectionsCard() {
  const { loading, connections, refetch } = useRealConnections()
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleConnect() {
    setError(null)
    setPending('connect')
    const err = await startBankConnection()
    if (err) {
      setError(err)
      setPending(null)
    }
  }

  async function handleDisconnect(id: string) {
    setError(null)
    setPending(id)
    const err = await disconnectBank()
    setPending(null)
    if (err) {
      setError(err)
      return
    }
    refetch()
  }

  const active = (connections ?? []).filter((c) => c.status === 'connected')

  return (
    <Card padding="lg" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-serif text-[22px] font-semibold text-ink">Tu conexión bancaria real</h2>
        <button
          type="button"
          onClick={() => void handleConnect()}
          disabled={pending === 'connect'}
          className="min-h-10 rounded-md border border-line bg-surface px-3.5 text-[15px] font-semibold text-ink hover:bg-canvas disabled:opacity-60"
        >
          {pending === 'connect' ? 'Conectando…' : 'Conectar otro banco'}
        </button>
      </div>

      {loading ? (
        <div className="text-base text-ink-muted">Cargando…</div>
      ) : active.length === 0 ? (
        <div className="text-base text-ink-muted">
          Todavía no has conectado ningún banco. Conéctalo aquí o desde Cuentas y patrimonio.
        </div>
      ) : (
        <div className="flex flex-col">
          {active.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-4 border-b border-[#f0f3f1] py-4 last:border-b-0">
              <div>
                <div className="text-[17px] font-semibold text-ink">{c.institution}</div>
                <div className="text-[15px] text-ink-muted">
                  {c.lastSyncedAt ? `Sincronizado ${formatIsoDateTime(c.lastSyncedAt)}` : 'Conectado, aún sin sincronizar'}
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Badge variant="success">Conectado</Badge>
                <button
                  type="button"
                  onClick={() => void handleDisconnect(c.id)}
                  disabled={pending === c.id}
                  className="min-h-10 rounded-md border border-danger-line bg-surface px-3.5 text-[15px] font-semibold text-danger-text hover:bg-danger-bg disabled:opacity-60"
                >
                  {pending === c.id ? 'Desconectando…' : 'Desconectar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {error && <div className="text-[15px] text-danger-text">{error}</div>}
    </Card>
  )
}
