import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { assetClassBreakdown, institutionBreakdown } from '../../data/accounts'

function BreakdownCard({ title, rows }: { title: string; rows: { label: string; amount: number; negative?: boolean }[] }) {
  return (
    <Card padding="lg" className="flex flex-col gap-4">
      <h2 className="font-serif text-[22px] lg:text-[19px] font-semibold text-ink">{title}</h2>
      <div className="flex flex-col gap-2.5 tabular">
        {rows.map((row) => (
          <div
            key={row.label}
            className={`flex justify-between text-base ${
              row.negative ? 'border-t border-line pt-2.5 text-danger-text' : 'text-ink'
            }`}
          >
            <span>{row.label}</span>
            <Money value={row.amount} tone={row.negative ? 'danger' : 'ink'} className="font-bold" />
          </div>
        ))}
      </div>
    </Card>
  )
}

/** Solo en Detalle: por clase de activo y por institución. No repite la tabla de cuentas. */
export function DetailBreakdowns() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <BreakdownCard title="Por clase de activo" rows={assetClassBreakdown} />
      <BreakdownCard title="Por institución" rows={institutionBreakdown} />
    </div>
  )
}
