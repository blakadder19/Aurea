import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { positions as demoPositions, type Position } from '../../data/investments'

/** Solo en Detalle: desglose por tipo de producto (no repite la tabla de posiciones). */
export function ProductTypeBreakdown({ positions = demoPositions }: { positions?: Position[] }) {
  const byType = new Map<string, number>()
  for (const p of positions) {
    byType.set(p.productType, (byType.get(p.productType) ?? 0) + p.value)
  }
  const total = positions.reduce((sum, p) => sum + p.value, 0)

  return (
    <Card padding="lg" className="flex flex-col gap-4">
      <h2 className="font-serif text-[22px] font-semibold text-ink">Por tipo de producto</h2>
      <div className="flex flex-col gap-2.5 tabular">
        {[...byType.entries()].map(([type, value]) => (
          <div key={type} className="flex justify-between text-base text-ink">
            <span>
              {type} <span className="text-ink-muted">· {((value / total) * 100).toLocaleString('es-ES', { maximumFractionDigits: 0 })} %</span>
            </span>
            <Money value={value} className="font-bold" />
          </div>
        ))}
      </div>
    </Card>
  )
}
