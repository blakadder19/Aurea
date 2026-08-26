import * as Dialog from '@radix-ui/react-dialog'
import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card } from '../../components/Card'
import { Skeleton } from '../../components/states/Skeleton'
import { formatIsoDayMonth, formatMoneySigned } from '../../lib/format'
import type { NetWorthPoint } from './netWorthHistory'

/** Mismo gráfico a tamaño completo, con ejes y tooltip por día — para ver el detalle que la tarjeta pequeña no puede mostrar. */
function ExpandedChartDialog({ open, onOpenChange, points }: { open: boolean; onOpenChange: (open: boolean) => void; points: NetWorthPoint[] }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgba(22,26,25,0.35)]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] w-[92vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-[20px] bg-surface p-6 focus:outline-none">
          <div className="flex items-start justify-between">
            <Dialog.Title className="font-serif text-[22px] font-semibold text-ink">Evolución del patrimonio</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" aria-label="Cerrar" className="flex h-11 w-11 items-center justify-center rounded-md border border-line bg-surface text-lg text-ink">
                ✕
              </button>
            </Dialog.Close>
          </div>
          <div className="h-[420px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                <defs>
                  <linearGradient id="netWorthTrendFillExpanded" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5b4cf0" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#5b4cf0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
                <XAxis dataKey="dateISO" tickFormatter={formatIsoDayMonth} stroke="var(--color-ink-muted)" fontSize={12} minTickGap={32} />
                <YAxis tickFormatter={(v: number) => formatMoneySigned(v, 0)} stroke="var(--color-ink-muted)" fontSize={12} width={80} />
                <Tooltip
                  formatter={(value) => formatMoneySigned(Number(value), 0)}
                  labelFormatter={(label) => formatIsoDayMonth(String(label))}
                  contentStyle={{ borderRadius: 8, borderColor: 'var(--color-line)' }}
                />
                <Area
                  type="monotone"
                  dataKey="netWorth"
                  stroke="#5b4cf0"
                  strokeWidth={2.5}
                  fill="url(#netWorthTrendFillExpanded)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** Evolución real del patrimonio neto en el periodo elegido, reconstruida a partir de tus movimientos reales — nunca una curva inventada. */
export function NetWorthTrendChart({ points, loading }: { points: NetWorthPoint[] | null; loading: boolean }) {
  const [expanded, setExpanded] = useState(false)

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
        <div className="flex items-center gap-3">
          <span className={`text-sm font-semibold tabular ${delta >= 0 ? 'text-green-text' : 'text-danger-text'}`}>
            {delta >= 0 ? '▲' : '▼'} {formatMoneySigned(delta, 0)} en este periodo
          </span>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="min-h-9 rounded-md border border-line px-3 text-sm font-semibold text-ink hover:bg-canvas"
          >
            Ampliar
          </button>
        </div>
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

      <ExpandedChartDialog open={expanded} onOpenChange={setExpanded} points={points} />
    </Card>
  )
}
