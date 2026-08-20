import { Money } from '../../components/Money'
import { nonSpendItems, type NonSpendItem } from '../../data/budget'

const TONE_STYLE: Record<NonSpendItem['tone'], { card: string; label: string; context: string }> = {
  info: { card: 'bg-info-bg border-info-line', label: 'text-info', context: 'text-info' },
  plum: { card: 'bg-plum-bg border-plum-line', label: 'text-plum', context: 'text-plum' },
  neutral: { card: 'bg-canvas border-line', label: 'text-ink-muted', context: 'text-ink-muted' },
}

/** Bloque 3 — Lo que no es consumo: ahorro, inversión y transferencias entre cuentas propias. */
export function NonSpendCards() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
      {nonSpendItems.map((item) => {
        const style = TONE_STYLE[item.tone]
        return (
          <div key={item.id} className={`flex flex-col gap-2 rounded-card border p-6 ${style.card}`}>
            <div className={`text-[13px] font-semibold tracking-[0.08em] uppercase ${style.label}`}>{item.label}</div>
            <Money value={item.amount} serif decimals={0} className="text-[28px] font-semibold" />
            <div className={`text-[15px] ${style.context}`}>{item.context}</div>
          </div>
        )
      })}
    </div>
  )
}
