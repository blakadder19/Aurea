import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { SectionLabel } from '../../components/SectionLabel'
import { netWorthKpis } from '../../data/accounts'
import { formatMoney } from '../../lib/format'

/** Bloque de cabecera: Activos, Pasivos y Patrimonio neto. */
export function NetWorthKpis() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
      <Card className="flex flex-col gap-2.5" padding="lg">
        <SectionLabel>Activos</SectionLabel>
        <Money value={netWorthKpis.assets} serif className="text-[36px] font-semibold" />
      </Card>
      <Card className="flex flex-col gap-2.5" padding="lg">
        <SectionLabel>Pasivos</SectionLabel>
        <Money value={-netWorthKpis.liabilities} tone="danger" serif className="text-[36px] font-semibold" />
      </Card>
      <Card tone="green-soft" className="flex flex-col gap-2.5" padding="lg">
        <div className="text-[13px] font-semibold tracking-[0.08em] text-green-text uppercase">Patrimonio neto</div>
        <Money value={netWorthKpis.netWorth} serif className="text-[36px] font-semibold" />
        <div className="text-sm font-semibold text-green-text">
          ▲ {formatMoney(netWorthKpis.netWorthDelta, 0)} este mes
        </div>
      </Card>
    </div>
  )
}
