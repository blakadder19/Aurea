import type { KeyboardEvent } from 'react'
import { Badge } from '../../components/Badge'
import { Money } from '../../components/Money'
import { SectionLabel } from '../../components/SectionLabel'
import { recurringItems, type RecurringItem } from '../../data/recurring'
import { useRecurringStore } from './store'

const CATEGORY_LABEL: Record<RecurringItem['category'], string> = {
  esenciales: 'Facturas esenciales',
  suscripciones: 'Suscripciones',
  otros: 'Otros recurrentes',
}

const HIGHLIGHT_BG: Record<'warning' | 'danger' | 'info', string> = {
  warning: 'bg-warning-bg',
  danger: 'bg-danger-bg',
  info: 'bg-info-bg',
}

function Row({ item, onResolveHighlight }: { item: RecurringItem; onResolveHighlight?: (item: RecurringItem) => void }) {
  const openPanel = useRecurringStore((s) => s.openPanel)
  const showUndo = useRecurringStore((s) => s.showUndo)

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter') openPanel(item.id)
  }

  return (
    <div
      tabIndex={0}
      role="button"
      data-row-id={item.id}
      aria-label={`Ver detalle de ${item.name}`}
      onClick={() => openPanel(item.id)}
      onKeyDown={handleKeyDown}
      className={`flex cursor-pointer flex-col gap-2 border-b border-[#f0f3f1] px-6 py-[18px] last:border-b-0 ${
        item.highlight ? HIGHLIGHT_BG[item.highlight.variant] : ''
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[17px] font-semibold text-ink">{item.name}</span>
            {item.highlight && (
              <Badge variant={item.highlight.variant} icon={item.highlight.icon} size="sm">
                {item.highlight.badge}
              </Badge>
            )}
          </div>
          <div className="mt-0.5 text-[15px] text-ink-muted">
            Próximo cargo {item.nextChargeLabel} · {item.frequency.toLowerCase()}
          </div>
        </div>
        <Money value={item.amount} className="text-[18px] font-bold whitespace-nowrap" />
      </div>

      {item.highlight && (
        <>
          <p className="text-base text-ink text-pretty">{item.highlight.explanation}</p>
          <div className="flex flex-wrap gap-2.5">
            {item.highlight.actions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  if (action.kind === 'view') openPanel(item.id)
                  else if (onResolveHighlight) onResolveHighlight(item)
                  else showUndo(item.highlight!.resolvedMessage)
                }}
                className="min-h-11 rounded-md border border-line bg-surface px-4 py-2.5 text-base font-semibold whitespace-nowrap text-ink"
              >
                {action.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

interface RecurringListProps {
  items?: RecurringItem[]
  onResolveHighlight?: (item: RecurringItem) => void
}

/** Vista Lista: tres bloques agrupados, con subtotales calculados a partir de los datos reales. */
export function RecurringList({ items: itemsProp, onResolveHighlight }: RecurringListProps = {}) {
  const source = itemsProp ?? recurringItems
  const categories: RecurringItem['category'][] = ['esenciales', 'suscripciones', 'otros']

  return (
    <div className="flex flex-col gap-6">
      {categories.map((category) => {
        const items = source.filter((i) => i.category === category)
        if (items.length === 0) return null
        const subtotal = items.reduce((sum, i) => sum + i.amount, 0)
        return (
          <div key={category}>
            <SectionLabel className="mb-3">
              {CATEGORY_LABEL[category]} · <Money value={subtotal} tone="muted" className="text-[13px] font-semibold" />
              /mes
            </SectionLabel>
            <div className="overflow-hidden rounded-card border border-line bg-surface">
              {items.map((item) => (
                <Row key={item.id} item={item} onResolveHighlight={onResolveHighlight} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
