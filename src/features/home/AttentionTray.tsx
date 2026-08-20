import { Badge } from '../../components/Badge'
import { Card } from '../../components/Card'
import { attentionItems } from '../../data/demo'

/** Bloque 5 — Necesita tu atención. Cuatro tarjetas accionables. */
export function AttentionTray() {
  return (
    <Card className="flex flex-col gap-4" padding="lg">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl font-semibold text-ink">Necesita tu atención</h2>
        <span className="rounded-full border border-danger-line bg-danger-bg px-2.5 py-1 text-sm font-semibold text-danger-text">
          {attentionItems.length} tareas
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {attentionItems.map((item) => (
          <div key={item.headline} className="flex flex-col gap-2.5 rounded-lg border border-line p-[18px]">
            <Badge variant={item.variant} size="sm">
              {item.status}
            </Badge>
            <div className="text-[17px] font-semibold text-ink">{item.headline}</div>
            <div className="text-base text-ink-muted">{item.detail}</div>
            <div className="flex gap-2.5">
              {item.actions.map((action) => (
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
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
