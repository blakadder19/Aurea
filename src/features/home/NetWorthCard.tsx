import { Line, LineChart, ResponsiveContainer } from 'recharts'
import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { SectionLabel } from '../../components/SectionLabel'
import { assets, liabilities, netWorth, netWorthDelta, netWorthDeltaPct, netWorthSeries } from '../../data/demo'
import { formatMoney, formatMoneySigned, formatPercentSigned } from '../../lib/format'

export interface RealNetWorth {
  netWorth: number
  assets: number
  liabilities: number
  /** (ingresos-gastos)/ingresos del mes en curso · null si aún no hay ingresos registrados este mes. */
  savingsRatePct: number | null
}

/** Bloque 2 — Patrimonio neto. KPI + curva de 12 meses (Recharts) + activos/pasivos. En real, sin curva: no hay fotos históricas de patrimonio. */
export function NetWorthCard({ real }: { real?: RealNetWorth } = {}) {
  const first = netWorthSeries[0]
  const last = netWorthSeries[netWorthSeries.length - 1]
  const data = real ?? { netWorth, assets, liabilities }

  return (
    <Card className="flex flex-col gap-3" padding="md">
      <div className="flex items-center justify-between">
        <SectionLabel>Patrimonio neto</SectionLabel>
        {real ? (
          <span className="text-sm text-ink-muted">A partir de tus cuentas reales</span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-green-soft-line bg-green-soft px-2.5 py-1 text-sm font-semibold text-green-text tabular">
            <span aria-hidden="true">▲</span> {formatMoneySigned(netWorthDelta, 0)} · {formatPercentSigned(netWorthDeltaPct)}
          </span>
        )}
      </div>

      <div className="font-serif text-[40px] leading-none font-semibold text-ink tabular">
        <Money value={data.netWorth} serif />
      </div>
      {!real && <p className="text-base text-ink">Has ganado {formatMoney(netWorthDelta, 0)} de patrimonio este mes</p>}

      {!real && (
        <>
          <div
            className="h-[72px] w-full"
            role="img"
            aria-label="Evolución del patrimonio neto en doce meses, tendencia al alza"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={netWorthSeries} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#0f6b4f" /* --color-green */
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between text-[13px] text-ink-muted tabular">
            <span>{first.month}</span>
            <span>{last.month}</span>
          </div>
        </>
      )}

      <div className="flex justify-between border-t border-line pt-3 text-base text-ink tabular">
        <span>
          Activos <strong className="font-bold">
            <Money value={data.assets} />
          </strong>
        </span>
        <span>
          Pasivos{' '}
          <strong className="font-bold">
            <Money value={-data.liabilities} tone="danger" />
          </strong>
        </span>
      </div>

      {real && (
        <div className="flex justify-between text-base text-ink tabular">
          <span>Tasa de ahorro este mes</span>
          {real.savingsRatePct === null ? (
            <span className="font-bold text-ink-muted">— (sin ingresos aún)</span>
          ) : (
            <strong className={`font-bold ${real.savingsRatePct >= 0 ? 'text-green-text' : 'text-danger-text'}`}>
              {real.savingsRatePct >= 0 ? '+' : ''}
              {real.savingsRatePct.toLocaleString('es-ES', { maximumFractionDigits: 0 })} %
            </strong>
          )}
        </div>
      )}
    </Card>
  )
}
