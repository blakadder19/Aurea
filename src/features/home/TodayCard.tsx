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

interface PendingAction {
  label: string
  to: string
}

/**
 * De la bandeja de avisos a botones cortos: lo que hay que hacer, no la
 * explicación de por qué. La explicación sigue estando más abajo, en
 * "Necesita tu atención".
 */
function toActions(items: AttentionItem[]): PendingAction[] {
  return items
    .map((item) => {
      const target = item.actions.find((a) => a.to)?.to
      return target ? { label: item.headline, to: target } : null
    })
    .filter((a): a is PendingAction => a !== null)
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
