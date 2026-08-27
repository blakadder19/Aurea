import { Link } from 'react-router-dom'
import { Card } from '../../components/Card'
import type { AttentionItem } from '../../data/demo'
import { formatWeekdayDate } from '../../lib/format'
import type { MonthTone, TodayHeadline } from './todayCalc'

/** Un acento por tono, para que el estado se lea antes de leer la frase. */
const ACCENT_BY_TONE: Record<MonthTone, string> = {
  holgado: 'bg-green',
  justo: 'bg-warning',
  apretado: 'bg-danger',
  'sin-datos': 'bg-ink-faint',
}

export interface PendingAction {
  label: string
  to: string
}

/**
 * De la bandeja de avisos a botones que dicen QUÉ HACER.
 *
 * El titular de un aviso nombra la cosa ("Gomo", "Tramyard Exchange Rent
 * To Eoin Moore"), que como botón no dice nada. La acción del propio aviso
 * ya está escrita en imperativo ("Abrir Centro de revisión", "Ver en Pagos
 * y suscripciones"), así que se usa esa. Varios avisos que llevan al mismo
 * sitio se juntan en un botón con el número, en vez de repetirlo.
 */
export function toActions(items: AttentionItem[]): PendingAction[] {
  const byDestination = new Map<string, { label: string; count: number }>()
  for (const item of items) {
    const action = item.actions.find((a) => a.to)
    if (!action?.to) continue
    const existing = byDestination.get(action.to)
    byDestination.set(action.to, { label: existing?.label ?? action.label, count: (existing?.count ?? 0) + 1 })
  }
  return [...byDestination.entries()]
    .map(([to, { label, count }]) => ({ to, label: count > 1 ? `${label} (${count})` : label }))
    .slice(0, 4)
}

/**
 * La cabecera de Inicio: cómo vas, en una frase, y qué te toca hacer.
 *
 * Sustituye a abrir la app con "Disponible hoy −785,06 €": el número
 * seguía siendo correcto, pero no decía si eso era bueno, de dónde salía
 * ni qué hacer al respecto. Las cifras no desaparecen — bajan a las
 * tarjetas de siempre, que es donde se consultan.
 */
export function TodayCard({ headline, attentionItems, today }: { headline: TodayHeadline; attentionItems: AttentionItem[]; today: Date }) {
  const actions = toActions(attentionItems)

  return (
    <Card padding="lg" className="flex flex-col gap-5">
      <div className="flex gap-4">
        <span aria-hidden="true" className={`mt-1 w-1 shrink-0 rounded-full ${ACCENT_BY_TONE[headline.tone]}`} />
        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-[13px] font-semibold tracking-[0.08em] text-ink-muted uppercase">{formatWeekdayDate(today)}</span>
          <h2 className="font-serif text-[32px] lg:text-[28px] font-semibold leading-tight tracking-[-0.01em] text-ink">{headline.headline}</h2>
          <p className="max-w-[62ch] text-base text-ink-muted">{headline.detail}</p>
        </div>
      </div>

      {actions.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <span className="text-[13px] font-semibold tracking-[0.08em] text-ink-muted uppercase">Te toca</span>
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className="inline-flex min-h-11 items-center rounded-md border border-line bg-surface px-3.5 text-[15px] font-semibold text-ink hover:bg-canvas"
              >
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
