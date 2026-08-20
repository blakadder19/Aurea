import { Link } from 'react-router-dom'
import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { CONTEXT_DATE, syncedAt } from '../../data/demo'
import { debts } from '../../data/debts'
import { formatMonthYearShort, monthsToPayoff } from './domain'

const TH = 'border-b border-line pb-2.5 text-right text-[13px] font-semibold tracking-[0.06em] text-ink-muted uppercase'
const TD = 'border-b border-[#f0f3f1] py-4 text-right text-base whitespace-nowrap'

/** Tabla de las cuatro deudas: saldo, tipo, cuota, próximo pago y fin previsto. */
export function DebtsTable() {
  return (
    <Card padding="lg" className="flex flex-col gap-4">
      <div className="overflow-x-auto -m-1 p-1">
        <table className="w-full min-w-[760px] border-collapse tabular">
          <thead>
            <tr>
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
            {debts.map((d) => {
              const months = d.monthlyPayment ? monthsToPayoff(d.balance, d.annualRate, d.monthlyPayment) : null
              const payoffLabel =
                months === null
                  ? 'Según uso'
                  : Number.isFinite(months)
                    ? formatMonthYearShort(new Date(CONTEXT_DATE.getFullYear(), CONTEXT_DATE.getMonth() + months, 1))
                    : 'Indefinido'

              return (
                <tr key={d.id}>
                  <td className="border-b border-[#f0f3f1] py-4 text-[17px] font-semibold whitespace-nowrap text-ink">
                    {d.name} · {d.institution}
                    {d.id === 'tarjeta' && (
                      <Link to="/pagos" className="ml-2 border-b border-green text-sm font-semibold text-green">
                        Ver en Pagos y suscripciones
                      </Link>
                    )}
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
                  <td className={`${TD} text-ink-muted`}>{payoffLabel}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="text-sm text-ink-muted">Sincronizado hoy a las {syncedAt}</div>
    </Card>
  )
}
