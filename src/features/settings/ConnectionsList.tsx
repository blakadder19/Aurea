import { Badge } from '../../components/Badge'
import { Card } from '../../components/Card'
import { connections } from '../../data/settings'
import { useSettingsStore } from './store'

const BADGE_BY_STATUS = {
  synced: { variant: 'success' as const, label: 'Sincronizado', icon: undefined },
  syncing: { variant: 'info' as const, label: 'Sincronizando', icon: '⟳' },
  error: { variant: 'danger' as const, label: 'Error', icon: undefined },
}

/** Lista de seis conexiones bancarias con estado explícito (color + icono + palabra). */
export function ConnectionsList() {
  const overrides = useSettingsStore((s) => s.connectionOverrides)
  const reconnect = useSettingsStore((s) => s.reconnect)

  return (
    <Card padding="lg" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <h2 className="font-serif text-[22px] font-semibold text-ink">Conexiones bancarias</h2>
        <Badge variant="neutral" icon="">
          Demostración
        </Badge>
      </div>

      <div className="flex flex-col">
        {connections.map((c) => {
          const override = overrides[c.id]
          const status = override?.status ?? c.status
          const detail = override?.detail ?? c.detail
          const badge = BADGE_BY_STATUS[status]

          return (
            <div key={c.id} className="flex items-center justify-between gap-4 border-b border-[#f0f3f1] py-4 last:border-b-0">
              <div>
                <div className="text-[17px] font-semibold text-ink">{c.name}</div>
                <div className="text-[15px] text-ink-muted">{detail}</div>
              </div>
              <div className="flex items-center gap-2.5">
                <Badge variant={badge.variant} icon={badge.icon}>
                  {badge.label}
                </Badge>
                {status === 'error' && (
                  <button
                    type="button"
                    onClick={() => reconnect(c.id)}
                    className="min-h-10 rounded-md border border-line bg-surface px-3.5 text-[15px] font-semibold text-ink hover:bg-canvas"
                  >
                    Reconectar
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
