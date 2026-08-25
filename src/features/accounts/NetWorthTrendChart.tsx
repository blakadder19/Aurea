import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { Card } from '../../components/Card'
import { Skeleton } from '../../components/states/Skeleton'
import { formatIsoDayMonth, formatMoneySigned } from '../../lib/format'
import type { NetWorthPoint } from './netWorthHistory'

/** Evolución real del patrimonio neto en el periodo elegido, reconstruida a partir de tus movimientos reales — nunca una curva inventada. */
export function NetWorthTrendChart({ points, loading }: { points: NetWorthPoint[] | null; loading: boolean }) {
  if (loading || points === null) {
    return (
      <Card padding="lg" className="flex flex-col gap-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-[140px] w-full" label="Cargando la evolución de tu patrimonio…" />
      </Card>
    )
  }

  if (points.length < 2) return null

  const first = points[0]
  const last = points[points.length - 1]
  const delta = last.netWorth - first.netWorth

  return (
    <Card padding="lg" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-serif text-[22px] lg:text-[19px] font-semibold text-ink">Evolución del patrimonio</h2>
        <span className={`text-sm font-semibold tabular ${delta >= 0 ? 'text-green-text' : 'text-danger-text'}`}>
          {delta >= 0 ? '▲' : '▼'} {formatMoneySigned(delta, 0)} en este periodo
        </span>
      </div>

      <div
        className="h-[140px] w-full"
        role="img"
        aria-label={`Evolución del patrimonio neto de ${formatIsoDayMonth(first.dateISO)} a ${formatIsoDayMonth(last.dateISO)}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <defs>
              <linearGradient id="netWorthTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5b4cf0" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#5b4cf0" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="netWorth"
              stroke="#5b4cf0"
              strokeWidth={2.5}
              fill="url(#netWorthTrendFill)"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between text-[13px] text-ink-muted tabular">
        <span>{formatIsoDayMonth(first.dateISO)}</span>
        <span>{formatIsoDayMonth(last.dateISO)}</span>
      </div>
    </Card>
  )
}
