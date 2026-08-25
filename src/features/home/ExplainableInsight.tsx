import { Link } from 'react-router-dom'
import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { insight } from '../../data/demo'

export interface RealInsight {
  headline: string
  body: string
  breakdown: { label: string; delta: number }[]
  total: number
}

/**
 * Bloque 6 — Insight explicable. Fondo verde suave, cálculo desglosado. En
 * real: solo si hay subidas de precio detectadas en recurrentes reales
 * (Pagos y suscripciones) — sin eso no se fabrica un insight genérico.
 */
export function ExplainableInsight({ real }: { real?: RealInsight } = {}) {
  const data = real ?? insight

  return (
    <Card tone="green-soft" className="flex flex-col gap-3.5" padding="lg">
      <div className="text-[13px] font-semibold tracking-[0.08em] text-green-text uppercase">
        Insight · estimación
      </div>
      <h2 className="font-serif text-2xl leading-[1.25] font-semibold text-ink">{data.headline}</h2>
      <p className="text-base text-ink text-pretty">{data.body}</p>

      <div className="flex flex-col gap-2 rounded-[14px] border border-green-soft-line bg-surface p-4 tabular">
        <div className="text-sm font-bold text-ink">El cálculo, a la vista</div>
        {data.breakdown.map((line) => (
          <div key={line.label} className="flex justify-between text-base text-ink">
            <span>{line.label}</span>
            <Money value={line.delta} signed decimals={0} className="font-bold" />
          </div>
        ))}
        <div className="flex justify-between border-t border-line pt-2 text-base text-ink">
          <span className="font-semibold">Desvío total estimado</span>
          <Money value={data.total} signed decimals={0} className="font-bold" />
        </div>
      </div>

      <div className="flex gap-2.5">
        {real ? (
          <Link to="/pagos" className="min-h-11 flex items-center rounded-md border border-green bg-green px-4 py-[11px] text-base font-semibold text-surface hover:bg-green-hover">
            Ver en Pagos y suscripciones
          </Link>
        ) : (
          <>
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
          </>
        )}
      </div>
    </Card>
  )
}
