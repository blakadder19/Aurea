import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { insight } from '../../data/demo'

/** Bloque 6 — Insight explicable. Fondo verde suave, cálculo desglosado. */
export function ExplainableInsight() {
  return (
    <Card tone="green-soft" className="flex flex-col gap-3.5" padding="lg">
      <div className="text-[13px] font-semibold tracking-[0.08em] text-green-text uppercase">
        Insight · estimación
      </div>
      <h2 className="font-serif text-2xl leading-[1.25] font-semibold text-ink">{insight.headline}</h2>
      <p className="text-base text-ink text-pretty">{insight.body}</p>

      <div className="flex flex-col gap-2 rounded-[14px] border border-green-soft-line bg-surface p-4 tabular">
        <div className="text-sm font-bold text-ink">El cálculo, a la vista</div>
        {insight.breakdown.map((line) => (
          <div key={line.label} className="flex justify-between text-base text-ink">
            <span>{line.label}</span>
            <Money value={line.delta} signed decimals={0} className="font-bold" />
          </div>
        ))}
        <div className="flex justify-between border-t border-line pt-2 text-base text-ink">
          <span className="font-semibold">Desvío total estimado</span>
          <Money value={insight.total} signed decimals={0} className="font-bold" />
        </div>
      </div>

      <div className="flex gap-2.5">
        <button
          type="button"
          className="min-h-11 rounded-md border border-green bg-green px-4 py-[11px] text-base font-semibold text-surface hover:bg-green-hover"
        >
          Ajustar el presupuesto
        </button>
        <a
          href="#calculo-completo"
          className="flex items-center self-center border-b border-green-text text-base font-semibold text-green-text"
        >
          Ver el cálculo completo
        </a>
      </div>
    </Card>
  )
}
