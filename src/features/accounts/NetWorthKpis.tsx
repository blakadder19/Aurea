import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { SectionLabel } from '../../components/SectionLabel'
import { netWorthKpis as demoNetWorthKpis } from '../../data/accounts'
import { formatMoney } from '../../lib/format'

interface Kpis {
  assets: number
  liabilities: number
  netWorth: number
  /** Sin dato de meses anteriores en datos reales todavía: se omite la línea si falta. */
  netWorthDelta?: number
}

export interface ForeignBalance {
  currency: string
  amount: number
}

/** Bloque de cabecera: Activos, Pasivos y Patrimonio neto. */
export function NetWorthKpis({
  kpis = demoNetWorthKpis,
  foreignBalances = [],
}: {
  kpis?: Kpis
  /** Subtotal real por divisa de las cuentas que no cuentan en el total en euros — nunca convertido, solo mostrado tal cual. */
  foreignBalances?: ForeignBalance[]
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Card className="flex flex-col gap-2.5" padding="lg">
          <SectionLabel>Activos</SectionLabel>
          <Money value={kpis.assets} serif className="text-[36px] font-semibold" />
        </Card>
        <Card className="flex flex-col gap-2.5" padding="lg">
          <SectionLabel>Pasivos</SectionLabel>
          <Money value={-kpis.liabilities} tone="danger" serif className="text-[36px] font-semibold" />
        </Card>
        <Card tone="green-soft" className="flex flex-col gap-2.5" padding="lg">
          <div className="text-[13px] font-semibold tracking-[0.08em] text-green-text uppercase">Patrimonio neto</div>
          <Money value={kpis.netWorth} serif className="text-[36px] font-semibold" />
          {kpis.netWorthDelta !== undefined && (
            <div className="text-sm font-semibold text-green-text">▲ {formatMoney(kpis.netWorthDelta, 0)} este mes</div>
          )}
        </Card>
      </div>
      {foreignBalances.length > 0 && (
        <p className="text-sm text-ink-muted">
          No incluido en el patrimonio en euros (sin un tipo de cambio fiable):{' '}
          {foreignBalances.map((f, i) => (
            <span key={f.currency} className="tabular">
              {i > 0 && ' · '}
              <Money value={f.amount} currency={f.currency} className="font-semibold text-ink" />
            </span>
          ))}
        </p>
      )}
    </div>
  )
}
