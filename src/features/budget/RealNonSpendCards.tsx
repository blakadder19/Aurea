import { Money } from '../../components/Money'
import type { RealNonSpendSummary } from './useRealNonSpend'

const euros = (cents: number) => cents / 100

/**
 * Bloque 3 real — Lo que no es consumo: dinero que entró en cuentas función
 * Ahorro/Inversión este ciclo, más transferencias entre tus propias cuentas.
 * Simplificación documentada en useRealNonSpend.ts: no distingue el origen
 * del dinero que entra en esas cuentas.
 */
export function RealNonSpendCards({ data }: { data: RealNonSpendSummary }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
      <div className="flex flex-col gap-2 rounded-card border border-info-line bg-info-bg p-6">
        <div className="text-[13px] font-semibold tracking-[0.08em] text-info uppercase">Ahorro este mes</div>
        <Money value={euros(data.ahorroCents)} serif decimals={0} className="text-[28px] font-semibold" />
        <div className="text-[15px] text-info">Entradas en cuentas función Ahorro</div>
      </div>
      <div className="flex flex-col gap-2 rounded-card border border-plum-line bg-plum-bg p-6">
        <div className="text-[13px] font-semibold tracking-[0.08em] text-plum uppercase">Inversión este mes</div>
        <Money value={euros(data.inversionCents)} serif decimals={0} className="text-[28px] font-semibold" />
        <div className="text-[15px] text-plum">Entradas en cuentas función Inversión</div>
      </div>
      <div className="flex flex-col gap-2 rounded-card border border-line bg-canvas p-6">
        <div className="text-[13px] font-semibold tracking-[0.08em] text-ink-muted uppercase">Transferencias este mes</div>
        <Money value={euros(data.transferenciasCents)} serif decimals={0} className="text-[28px] font-semibold" />
        <div className="text-[15px] text-ink-muted">Entre tus propias cuentas</div>
      </div>
    </div>
  )
}
