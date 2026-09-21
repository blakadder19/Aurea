import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { formatIsoDayMonth } from '../../lib/format'
import { tagBgClass } from '../../lib/tagColor'
import type { TagSummary } from '../../lib/tagSummary'
import type { TransactionTag } from '../../data/transactions'

/**
 * Cuánto costó lo que lleva una etiqueta, encima de la lista que lo compone.
 *
 * Va aquí y no en Informes porque un informe es de un mes y un viaje no
 * respeta los meses: uno que empiece el 29 saldría partido en dos. Y porque
 * así la cifra se calcula sobre exactamente los mismos movimientos que se ven
 * debajo — no puede discrepar de ellos, que es como aparecen los contadores
 * que dicen una cosa y la lista otra.
 */
export function TagSummaryCard({ tag, summary }: { tag: TransactionTag; summary: TagSummary }) {
  const { totalCents, movementCount, fromISO, toISO, byCategory, uncovered } = summary

  return (
    <section data-testid="tag-summary">
      <Card padding="lg" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className={`rounded-full px-2.5 py-1 text-[13px] font-medium text-surface ${tagBgClass(tag.color)}`}>
              {tag.emoji ? `${tag.emoji} ` : ''}
              {tag.name}
            </span>
            <span className="text-[15px] text-ink-muted">
              {movementCount} movimiento{movementCount === 1 ? '' : 's'}
              {fromISO && toISO && (
                <> · {fromISO === toISO ? formatIsoDayMonth(fromISO) : `${formatIsoDayMonth(fromISO)} – ${formatIsoDayMonth(toISO)}`}</>
              )}
            </span>
          </div>
          <Money value={totalCents / 100} decimals={2} className="font-serif text-[26px] font-semibold" />
        </div>

        {byCategory.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-line pt-3">
            {byCategory.map((row) => (
              <div key={row.categoria} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-3 text-[15px]">
                  <span className="text-ink">{row.categoria}</span>
                  <span className="flex items-baseline gap-2 tabular">
                    <span className="text-sm text-ink-muted">{Math.round(row.share)} %</span>
                    <Money value={row.cents / 100} decimals={2} className="font-semibold" />
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-canvas">
                  <div className={`h-1.5 rounded-full ${tagBgClass(tag.color)}`} style={{ width: `${Math.max(row.share, 1)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {movementCount === 0 && <p className="text-[15px] text-ink-muted">Ningún gasto con esta etiqueta todavía.</p>}

        {uncovered.length > 0 && (
          <p className="max-w-[70ch] border-t border-line pt-3 text-[15px] text-ink-muted">
            Fuera de esa cifra:{' '}
            {uncovered.map((u, i) => (
              <span key={u.currency}>
                {i > 0 && ' · '}
                <Money value={u.cents / 100} decimals={2} currency={u.currency} className="font-semibold text-ink" /> sin convertir
              </span>
            ))}
            . Se gastaron desde un saldo anterior a tu primera sincronización, así que no hay ningún cambio al que atribuirles un euro.
          </p>
        )}
      </Card>
    </section>
  )
}
