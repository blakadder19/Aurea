import * as Dialog from '@radix-ui/react-dialog'
import { useRef } from 'react'
import { Badge } from '../../components/Badge'
import { Money } from '../../components/Money'
import { SectionLabel } from '../../components/SectionLabel'
import { SidePanel } from '../../components/SidePanel'
import { recurringItems, type RecurringItem } from '../../data/recurring'
import { useRecurringStore } from './store'
import { focusRowById } from '../../lib/dom'

function PanelContent({ item, onResolve }: { item: RecurringItem; onResolve: (message: string) => void }) {
  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <SectionLabel>Suscripción</SectionLabel>
          <Dialog.Title className="mt-1 font-serif text-[28px] font-semibold text-ink">{item.name}</Dialog.Title>
        </div>
        <Dialog.Close asChild>
          <button
            type="button"
            aria-label="Cerrar panel"
            className="flex h-11 w-11 items-center justify-center rounded-md border border-line bg-surface text-lg text-ink"
          >
            ✕
          </button>
        </Dialog.Close>
      </div>

      <Dialog.Description className="sr-only">
        Importe, periodicidad, cuenta de cargo e historial de esta suscripción.
      </Dialog.Description>

      {item.highlight && (
        <Badge variant={item.highlight.variant} icon={item.highlight.icon}>
          {item.highlight.badge}
        </Badge>
      )}

      <div className="font-serif text-[36px] font-semibold text-ink tabular">
        <Money value={item.amount} />
        <span className="text-base font-normal text-ink-muted"> /mes</span>
      </div>

      <div className="flex flex-col gap-2 rounded-[14px] border border-line p-4 tabular">
        {item.history.length > 0 && item.history[0].amount !== item.amount && (
          <div className="flex justify-between text-[15px] text-ink-muted">
            <span>Importe anterior</span>
            <Money value={item.history[0].amount} className="font-semibold text-ink" />
          </div>
        )}
        <div className="flex justify-between text-[15px] text-ink-muted">
          <span>Frecuencia</span>
          <span className="font-semibold text-ink">{item.frequency}</span>
        </div>
        <div className="flex justify-between text-[15px] text-ink-muted">
          <span>Próximo cargo</span>
          <span className="font-semibold text-ink">{item.nextChargeLabel} 2026</span>
        </div>
        <div className="flex justify-between text-[15px] text-ink-muted">
          <span>Cuenta</span>
          <span className="font-semibold text-ink">{item.account}</span>
        </div>
      </div>

      <h3 className="mt-2 text-[17px] font-bold text-ink">Historial</h3>
      {item.history.length === 0 ? (
        <p className="text-[15px] text-ink-muted">Sin historial: es una suscripción o prueba nueva.</p>
      ) : (
        <div className="flex flex-col gap-2.5 tabular">
          {item.history.map((h) => (
            <div key={`${h.date}-${h.amount}`} className="flex justify-between text-[15px]">
              <span className="text-ink">{h.date}</span>
              <span className={`font-bold ${h.amount !== item.amount ? 'text-warning-text' : 'text-ink'}`}>
                <Money value={h.amount} tone={h.amount !== item.amount ? 'warning' : 'ink'} />
                {h.amount !== item.amount && <span className="ml-1.5 text-[13px] font-semibold">· antes</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => onResolve(`${item.name} en pausa.`)}
          className="min-h-11 rounded-md border border-line px-4 py-2.5 text-base font-semibold text-ink"
        >
          Pausar
        </button>
        <button
          type="button"
          onClick={() => onResolve(`${item.name} cancelado.`)}
          className="min-h-11 rounded-md border border-line px-4 py-2.5 text-base font-semibold text-danger-text"
        >
          Cancelar
        </button>
        <button
          type="button"
          className="min-h-11 rounded-md border border-line px-4 py-2.5 text-base font-semibold text-ink"
        >
          Cambiar cuenta
        </button>
      </div>
    </>
  )
}

interface SubscriptionDetailPanelProps {
  items?: RecurringItem[]
  onResolve?: (item: RecurringItem, message: string) => void
}

/** Panel genérico de detalle: se abre desde cualquier fila de la lista o el calendario. */
export function SubscriptionDetailPanel({ items: itemsProp, onResolve: onResolveProp }: SubscriptionDetailPanelProps = {}) {
  const itemId = useRecurringStore((s) => s.panelItemId)
  const closePanel = useRecurringStore((s) => s.closePanel)
  const showUndo = useRecurringStore((s) => s.showUndo)
  const source = itemsProp ?? recurringItems
  const item = source.find((i) => i.id === itemId) ?? null

  const lastOpenedId = useRef<string | null>(null)
  if (itemId) lastOpenedId.current = itemId

  return (
    <SidePanel
      open={item !== null}
      onOpenChange={(open) => !open && closePanel()}
      onCloseAutoFocus={(event) => {
        event.preventDefault()
        const id = lastOpenedId.current
        setTimeout(() => focusRowById(id), 0)
      }}
    >
      {item && (
        <PanelContent
          key={item.id}
          item={item}
          onResolve={(message) => {
            if (onResolveProp) onResolveProp(item, message)
            else showUndo(message)
            closePanel()
          }}
        />
      )}
    </SidePanel>
  )
}
