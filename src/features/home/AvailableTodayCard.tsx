import { useEffect, useState } from 'react'
import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { RingChart } from '../../components/RingChart'
import { SectionLabel } from '../../components/SectionLabel'
import { Skeleton } from '../../components/states/Skeleton'
import {
  availableToday,
  commitments14d,
  commitmentsLabel,
  eligibleAccounts,
  eligibleAccountsSum,
  outsideAvailable,
  syncedAt,
  type EligibleAccount,
  type OutsideAvailableItem,
} from '../../data/demo'
import { useHomeUIStore } from '../../store/useHomeUIStore'

const LOADING_MS = 600

export interface RealAvailableToday {
  availableToday: number
  eligibleAccounts: EligibleAccount[]
  eligibleAccountsSum: number
  commitments14d: number
  commitmentsLabel: string
  outsideAvailable: OutsideAvailableItem[]
}

/** Bloque 1 — Disponible hoy. Cifra hero + desglose expandible in-place (no modal). */
export function AvailableTodayCard({ real }: { real?: RealAvailableToday } = {}) {
  const showCalc = useHomeUIStore((s) => s.showCalc)
  const toggleCalc = useHomeUIStore((s) => s.toggleCalc)
  const [loading, setLoading] = useState(!real)

  useEffect(() => {
    if (real) return
    const id = setTimeout(() => setLoading(false), LOADING_MS)
    return () => clearTimeout(id)
  }, [real])

  if (loading) {
    return (
      <Card className="flex flex-col gap-5" padding="lg">
        <SectionLabel>Disponible hoy</SectionLabel>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-[48px] w-64 lg:h-[72px] lg:w-80" label="Cargando tu Disponible hoy…" />
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-4 w-2/5" />
        </div>
        <div className="text-[15px] text-ink-muted">Cargando tu Disponible hoy…</div>
      </Card>
    )
  }

  const data = real ?? { availableToday, eligibleAccounts, eligibleAccountsSum, commitments14d, commitmentsLabel, outsideAvailable }

  return (
    <Card className="flex flex-col gap-5" padding="lg">
      <SectionLabel>Disponible hoy</SectionLabel>

      <div className="flex flex-wrap items-center gap-5">
        <RingChart
          segments={[{ value: Math.max(0, data.availableToday), strokeClassName: 'stroke-brand' }]}
          max={Math.max(data.eligibleAccountsSum, data.availableToday, 1)}
          size={92}
          strokeWidth={10}
          ariaLabel="Disponible hoy como proporción de tus cuentas para gastar"
        >
          <span className="text-[10px] font-bold tracking-[0.04em] text-ink-faint uppercase">Hoy</span>
        </RingChart>
        <div>
          <div className="font-serif text-[42px] leading-none font-extrabold tracking-[-0.02em] text-ink tabular lg:text-[58px]">
            <Money value={data.availableToday} />
          </div>
          <p className="mt-2.5 max-w-[46ch] text-base text-ink-muted text-pretty">
            Puedes gastar esto sin tocar tu ahorro ni dejar sin cubrir los pagos de los próximos 14 días.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggleCalc}
          aria-expanded={showCalc}
          aria-controls="disponible-hoy-desglose"
          className="min-h-11 rounded-xl border border-brand px-4 py-[11px] text-base font-semibold text-brand hover:bg-brand-soft"
        >
          Ver cómo se calcula
        </button>
        {!real && <span className="text-sm text-ink-muted">Actualizado hoy a las {syncedAt}</span>}
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
            {data.eligibleAccounts.length === 0 && <div className="text-base text-ink-muted">Ninguna cuenta marcada como «Para gastar».</div>}
            {data.eligibleAccounts.map((account) => (
              <div key={account.label} className="flex justify-between text-base text-ink">
                <span>{account.label}</span>
                <Money value={account.amount} className="font-semibold" />
              </div>
            ))}

            <div className="flex justify-between border-t border-line pt-2 text-base text-ink">
              <span className="font-semibold">Suma en cuentas para gastar</span>
              <Money value={data.eligibleAccountsSum} className="font-bold" />
            </div>

            <div className="flex justify-between text-base">
              <span className="font-normal text-danger-text">− {data.commitmentsLabel}</span>
              <Money value={-data.commitments14d} tone="danger" className="font-bold" />
            </div>

            <div className="flex justify-between border-t-2 border-ink pt-2.5 text-xl text-ink">
              <span className="font-bold">Disponible hoy</span>
              <Money value={data.availableToday} serif className="text-[26px] font-bold" />
            </div>
          </div>

          <div className="border-t border-line pt-3.5">
            <div className="mb-2 text-sm font-bold text-ink">Qué no entra en esta cifra</div>
            <div className="flex flex-wrap gap-2">
              {data.outsideAvailable.map((item) => (
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
