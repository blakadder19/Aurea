import { Line, LineChart, ResponsiveContainer } from 'recharts'
import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { SectionLabel } from '../../components/SectionLabel'
import { portfolioSummary, valueSeries } from '../../data/investments'

export interface RealPortfolioSummary {
  currentValue: number
  contributed: number
  gain: number
  gainPct: number
}

/** Bloque 1 — Valor actual, curva de evolución y aportado/rendimiento/rentabilidad. */
export function PortfolioSummaryCard({ real }: { real?: RealPortfolioSummary }) {
  const chartData = valueSeries.map((value, i) => ({ i, value }))
  const summary = real ?? portfolioSummary
  const gainTone = summary.gain >= 0 ? 'green' : 'danger'

  return (
    <Card className="flex flex-col gap-[18px]" padding="lg">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <SectionLabel>Valor actual</SectionLabel>
          <Money value={summary.currentValue} serif className="mt-1.5 text-[56px] leading-none font-semibold" />
        </div>
        {!real && (
          <div
            className="h-16 w-[260px]"
            role="img"
            aria-label="Evolución del valor de las inversiones en doce meses, tendencia al alza"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#0f6b4f"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Nunca en letra pequeña gris: mismo tamaño que el resto de metadatos de cabecera, con hora. */}
      <div className="inline-flex w-fit items-center gap-2 rounded-md border border-line bg-canvas px-3 py-2 text-sm font-semibold text-ink-muted">
        {real ? 'Gestionado a mano · sin cotización en vivo' : `Cotizaciones simuladas · ${portfolioSummary.syncedAt}`}
      </div>

      <div className="flex flex-wrap gap-10 border-t border-line pt-4 tabular">
        <div>
          <div className="text-sm text-ink-muted">Aportado</div>
          <Money value={summary.contributed} className="text-2xl font-bold" />
        </div>
        <div>
          <div className="text-sm text-ink-muted">Rendimiento</div>
          <Money value={summary.gain} signed tone={gainTone} className="text-2xl font-bold" />
        </div>
        <div>
          <div className="text-sm text-ink-muted">Rentabilidad</div>
          <span className={`text-2xl font-bold ${gainTone === 'green' ? 'text-green' : 'text-danger-text'}`}>
            {summary.gainPct >= 0 ? '+' : ''}
            {summary.gainPct.toLocaleString('es-ES', { minimumFractionDigits: 1 })} %
          </span>
        </div>
      </div>
    </Card>
  )
}
