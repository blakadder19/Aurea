import { Card } from '../../components/Card'
import { ProgressBar } from '../../components/ProgressBar'
import type { Position } from '../../data/investments'

const FILL_PALETTE = ['bg-plum', 'bg-info', 'bg-warning', 'bg-brand', 'bg-danger'] as const

/**
 * Asignación real por tipo de producto, calculada de tus posiciones — a
 * diferencia de la demo, no hay una cartera modelo (renta variable/fija/
 * cripto) guardada por usuario, así que no comparamos contra un objetivo
 * inventado: solo mostramos cómo se reparte tu dinero hoy.
 */
export function RealAllocationCard({ positions }: { positions: Position[] }) {
  const total = positions.reduce((sum, p) => sum + p.value, 0)
  if (total <= 0) return null

  const byType = new Map<string, number>()
  for (const p of positions) {
    byType.set(p.productType, (byType.get(p.productType) ?? 0) + p.value)
  }
  const rows = [...byType.entries()]
    .map(([type, value]) => ({ type, pct: (value / total) * 100 }))
    .sort((a, b) => b.pct - a.pct)

  return (
    <Card padding="lg" className="flex flex-col gap-[18px]">
      <h2 className="font-serif text-2xl font-semibold text-ink">Tu asignación actual por tipo de producto</h2>
      <div className="flex flex-col gap-3.5">
        {rows.map((r, i) => (
          <div key={r.type}>
            <div className="mb-1.5 flex flex-wrap justify-between gap-2 text-base">
              <span className="font-semibold text-ink">{r.type}</span>
              <span className="text-ink-muted tabular">{r.pct.toLocaleString('es-ES', { maximumFractionDigits: 0 })} %</span>
            </div>
            <ProgressBar
              percent={r.pct}
              fillClassName={FILL_PALETTE[i % FILL_PALETTE.length]}
              heightPx={12}
              label={`${r.type}: ${r.pct.toLocaleString('es-ES', { maximumFractionDigits: 0 })}% de tu cartera`}
            />
          </div>
        ))}
      </div>
    </Card>
  )
}
