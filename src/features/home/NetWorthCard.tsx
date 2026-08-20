import { Line, LineChart, ResponsiveContainer } from 'recharts'
import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { SectionLabel } from '../../components/SectionLabel'
import { assets, liabilities, netWorth, netWorthDelta, netWorthDeltaPct, netWorthSeries } from '../../data/demo'
import { formatMoney, formatMoneySigned, formatPercentSigned } from '../../lib/format'

/** Bloque 2 — Patrimonio neto. KPI + curva de 12 meses (Recharts) + activos/pasivos. */
export function NetWorthCard() {
  const first = netWorthSeries[0]
  const last = netWorthSeries[netWorthSeries.length - 1]

  return (
    <Card className="flex flex-col gap-3" padding="md">
      <div className="flex items-center justify-between">
        <SectionLabel>Patrimonio neto</SectionLabel>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-green-soft-line bg-green-soft px-2.5 py-1 text-sm font-semibold text-green-text tabular">
          <span aria-hidden="true">▲</span> {formatMoneySigned(netWorthDelta, 0)} · {formatPercentSigned(netWorthDeltaPct)}
        </span>
      </div>

      <div className="font-serif text-[40px] leading-none font-semibold text-ink tabular">
        <Money value={netWorth} serif />
      </div>
      <p className="text-base text-ink">Has ganado {formatMoney(netWorthDelta, 0)} de patrimonio este mes</p>

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

      <div className="flex justify-between border-t border-line pt-3 text-base text-ink tabular">
        <span>
          Activos <strong className="font-bold">
            <Money value={assets} />
          </strong>
        </span>
        <span>
          Pasivos{' '}
          <strong className="font-bold">
            <Money value={-liabilities} tone="danger" />
          </strong>
        </span>
      </div>
    </Card>
  )
}
