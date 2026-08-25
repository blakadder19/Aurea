import { Link } from 'react-router-dom'
import { Badge } from '../../components/Badge'
import { Card } from '../../components/Card'
import { attentionItems, type AttentionItem } from '../../data/demo'
import { EmptyState } from '../../components/states/EmptyState'

/** Bloque 5 — Necesita tu atención. Tarjetas accionables. En real, derivadas de señales reales (revisión pendiente, avisos de recurrentes, cuentas sin función, mayor pago próximo). */
export function AttentionTray({ real }: { real?: AttentionItem[] } = {}) {
  const items = real ?? attentionItems

  return (
    <Card className="flex flex-col gap-4" padding="lg">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl font-semibold text-ink">Necesita tu atención</h2>
        {items.length > 0 && (
          <span className="rounded-full border border-danger-line bg-danger-bg px-2.5 py-1 text-sm font-semibold text-danger-text">
            {items.length} tarea{items.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState headline="Todo al día" body="No hay nada que necesite tu atención ahora mismo." action={{ label: 'Ver movimientos', to: '/movimientos' }} />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div key={item.headline} className="flex flex-col gap-2.5 rounded-lg border border-line p-[18px]">
              <Badge variant={item.variant} size="sm">
                {item.status}
              </Badge>
              <div className="text-[17px] font-semibold text-ink">{item.headline}</div>
              <div className="text-base text-ink-muted">{item.detail}</div>
              <div className="flex gap-2.5">
                {item.actions.map((action) =>
                  action.to ? (
                    <Link
                      key={action.label}
                      to={action.to}
                      className={
                        action.primary
                          ? 'min-h-11 self-start rounded-md border border-green bg-green px-4 py-2.5 text-base font-semibold text-surface hover:bg-green-hover'
                          : 'min-h-11 self-start rounded-md border border-line bg-surface px-4 py-2.5 text-base font-semibold text-ink hover:border-ink'
                      }
                    >
                      {action.label}
                    </Link>
                  ) : (
                    <button
                      key={action.label}
                      type="button"
                      className={
                        action.primary
                          ? 'min-h-11 self-start rounded-md border border-green bg-green px-4 py-2.5 text-base font-semibold text-surface hover:bg-green-hover'
                          : 'min-h-11 self-start rounded-md border border-line bg-surface px-4 py-2.5 text-base font-semibold text-ink hover:border-ink'
                      }
                    >
                      {action.label}
                    </button>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
