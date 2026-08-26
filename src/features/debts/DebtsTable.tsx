import { Link } from 'react-router-dom'
import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { CONTEXT_DATE, syncedAt } from '../../data/demo'
import { debts as demoDebts, type Debt } from '../../data/debts'
import { categoryColorClass } from '../../lib/categoryColor'
import { formatMonthYearShort, monthsToPayoff } from './domain'

const TH = 'border-b border-line pb-2.5 text-right text-[13px] font-semibold tracking-[0.06em] text-ink-muted uppercase'
const TD = 'border-b border-[#f0f3f1] py-4 text-right text-base whitespace-nowrap'

function Avatar({ debt }: { debt: Debt }) {
  return (
    <div
      aria-hidden="true"
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-surface ${categoryColorClass(debt.institution)}`}
    >
      {debt.name.charAt(0).toUpperCase()}
    </div>
  )
}

function payoffLabelFor(d: Debt, asOf: Date): string {
  const months = d.monthlyPayment ? monthsToPayoff(d.balance, d.annualRate, d.monthlyPayment) : null
  if (months === null) return 'Según uso'
  if (!Number.isFinite(months)) return 'Indefinido'
  return formatMonthYearShort(new Date(asOf.getFullYear(), asOf.getMonth() + months, 1))
}

/** Tabla de deudas: saldo, tipo, cuota, próximo pago y fin previsto. */
export function DebtsTable({
  debts = demoDebts,
  asOf = CONTEXT_DATE,
  syncNote = `Sincronizado hoy a las ${syncedAt}`,
  onEditDetail,
}: {
  debts?: Debt[]
  asOf?: Date
  syncNote?: string | null
  /** Solo en real: abre el panel para editar tipo/cuota/próximo pago de esa deuda. */
  onEditDetail?: (accountId: string) => void
}) {
  return (
    <Card padding="lg" className="flex flex-col gap-4">
      <div className="hidden overflow-x-auto -m-1 p-1 lg:block">
        <table className="w-full min-w-[760px] border-collapse tabular">
          <thead>
            <tr>
              <th className="border-b border-line pb-2.5" aria-hidden="true"></th>
              <th className="border-b border-line pb-2.5 text-left text-[13px] font-semibold tracking-[0.06em] text-ink-muted uppercase">
                Deuda
              </th>
              <th className={TH}>Saldo</th>
              <th className={TH}>Tipo</th>
              <th className={TH}>Cuota</th>
              <th className={TH}>Próximo pago</th>
              <th className={TH}>Fin previsto</th>
            </tr>
          </thead>
          <tbody>
            {debts.map((d) => (
              <tr key={d.id}>
                <td className="border-b border-[#f0f3f1] py-4 pr-3">
                  <Avatar debt={d} />
                </td>
                <td className="border-b border-[#f0f3f1] py-4 text-[17px] font-semibold whitespace-nowrap text-ink">
                  {d.name} · {d.institution}
                  {d.id === 'tarjeta' && (
                    <Link to="/pagos" className="ml-2 border-b border-brand text-sm font-semibold text-brand">
                      Ver en Pagos y suscripciones
                    </Link>
                  )}
                  {onEditDetail && (
                    <button type="button" onClick={() => onEditDetail(d.id)} className="ml-2 border-b border-brand text-sm font-semibold text-brand">
                      Editar detalle
                    </button>
                  )}
                  {d.reminder && <div className="mt-0.5 text-[13px] font-normal whitespace-normal text-ink-muted">📌 {d.reminder}</div>}
                </td>
                <td className={`${TD} font-bold text-danger-text`}>
                  <Money value={-d.balance} />
                </td>
                <td className={`${TD} text-ink-muted`}>
                  {d.annualRate === 0
                    ? '0 %'
                    : `${(d.annualRate * 100).toLocaleString('es-ES', { minimumFractionDigits: 2 })} %`}
                </td>
                <td className={`${TD} text-ink`}>{d.paymentLabel}</td>
                <td className={`${TD} text-ink-muted`}>{d.nextPaymentLabel}</td>
                <td className={`${TD} text-ink-muted`}>{payoffLabelFor(d, asOf)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2.5 lg:hidden">
        {debts.map((d) => (
          <div key={d.id} className="flex flex-col gap-2 rounded-2xl border border-line p-3.5 tabular">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Avatar debt={d} />
                <div className="text-[17px] font-semibold text-ink">
                  {d.name} · {d.institution}
                </div>
              </div>
              <Money value={-d.balance} tone="danger" className="shrink-0 whitespace-nowrap font-bold" />
            </div>
            {d.id === 'tarjeta' && (
              <Link to="/pagos" className="self-start border-b border-brand text-sm font-semibold text-brand">
                Ver en Pagos y suscripciones
              </Link>
            )}
            {onEditDetail && (
              <button type="button" onClick={() => onEditDetail(d.id)} className="self-start border-b border-brand text-sm font-semibold text-brand">
                Editar detalle
              </button>
            )}
            <div className="text-sm text-ink-muted">
              {d.annualRate === 0 ? '0 %' : `${(d.annualRate * 100).toLocaleString('es-ES', { minimumFractionDigits: 2 })} %`} ·{' '}
              {d.paymentLabel} · próximo pago {d.nextPaymentLabel} · fin previsto {payoffLabelFor(d, asOf)}
            </div>
            {d.reminder && <div className="text-sm text-ink-muted">📌 {d.reminder}</div>}
          </div>
        ))}
      </div>

      {syncNote && <div className="text-sm text-ink-muted">{syncNote}</div>}
    </Card>
  )
}
