import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { SectionLabel } from '../../components/SectionLabel'
import {
  availableToday,
  commitments14d,
  commitmentsLabel,
  eligibleAccounts,
  eligibleAccountsSum,
  outsideAvailable,
  syncedAt,
} from '../../data/demo'
import { useHomeUIStore } from '../../store/useHomeUIStore'

/** Bloque 1 — Disponible hoy. Cifra hero + desglose expandible in-place (no modal). */
export function AvailableTodayCard() {
  const showCalc = useHomeUIStore((s) => s.showCalc)
  const toggleCalc = useHomeUIStore((s) => s.toggleCalc)

  return (
    <Card className="flex flex-col gap-5" padding="lg">
      <SectionLabel>Disponible hoy</SectionLabel>

      <div>
        <div className="font-serif text-[48px] leading-none font-semibold tracking-[-0.02em] text-ink tabular lg:text-[72px]">
          <Money value={availableToday} />
        </div>
        <p className="mt-3.5 max-w-[46ch] text-lg text-ink text-pretty">
          Puedes gastar esto sin tocar tu ahorro ni dejar sin cubrir los pagos de los próximos 14 días.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggleCalc}
          aria-expanded={showCalc}
          aria-controls="disponible-hoy-desglose"
          className="min-h-11 rounded-md border border-green px-4 py-[11px] text-base font-semibold text-green hover:bg-green-soft"
        >
          Ver cómo se calcula
        </button>
        <span className="text-sm text-ink-muted">Actualizado hoy a las {syncedAt}</span>
      </div>

      {showCalc && (
        <div
          id="disponible-hoy-desglose"
          className="flex flex-col gap-3.5 rounded-lg border border-line bg-canvas p-6"
        >
          <div className="text-base font-bold text-ink">
            Cuentas aptas para gastar menos compromisos a 14 días
          </div>

          <div className="flex flex-col gap-2 tabular">
            {eligibleAccounts.map((account) => (
              <div key={account.label} className="flex justify-between text-base text-ink">
                <span>{account.label}</span>
                <Money value={account.amount} className="font-semibold" />
              </div>
            ))}

            <div className="flex justify-between border-t border-line pt-2 text-base text-ink">
              <span className="font-semibold">Suma en cuentas para gastar</span>
              <Money value={eligibleAccountsSum} className="font-bold" />
            </div>

            <div className="flex justify-between text-base">
              <span className="font-normal text-danger-text">− {commitmentsLabel}</span>
              <Money value={-commitments14d} tone="danger" className="font-bold" />
            </div>

            <div className="flex justify-between border-t-2 border-ink pt-2.5 text-xl text-ink">
              <span className="font-bold">Disponible hoy</span>
              <Money value={availableToday} serif className="text-[26px] font-bold" />
            </div>
          </div>

          <div className="border-t border-line pt-3.5">
            <div className="mb-2 text-sm font-bold text-ink">Qué no entra en esta cifra</div>
            <div className="flex flex-wrap gap-2">
              {outsideAvailable.map((item) => (
                <span
                  key={item.label}
                  className={`rounded-full border bg-surface px-3 py-1.5 text-sm text-ink-muted tabular ${
                    item.pending ? 'border-dashed border-[#c4ccc8]' : 'border-line'
                  }`}
                >
                  {item.label} <Money value={item.amount} tone="muted" />
                  {item.pending && ' · por confirmar'}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
