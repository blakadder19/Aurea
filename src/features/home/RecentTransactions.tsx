import { Link } from 'react-router-dom'
import { Card } from '../../components/Card'
import { Money, type MoneyTone } from '../../components/Money'
import { movimientos, totalMovementsThisMonth, type Movement } from '../../data/demo'
import { useHomeUIStore } from '../../store/useHomeUIStore'

function toneFor(movement: Movement): MoneyTone {
  if (movement.importe > 0) return 'green'
  if (movement.estado === 'Requiere revisión') return 'danger'
  return 'ink'
}

const TH = 'border-b border-line pr-4 pb-2.5 text-left text-[13px] font-semibold tracking-[0.06em] text-ink-muted uppercase'
const TD = 'border-b border-[#f0f3f1] py-3 pr-4 text-base'

export interface RealRecentTransactions {
  movements: Movement[]
  totalThisMonth: number
}

/** Bloque 7 — Últimos movimientos. En Detalle añade columnas Cuenta y Estado. */
export function RecentTransactions({ real }: { real?: RealRecentTransactions } = {}) {
  const isDetalle = useHomeUIStore((s) => s.mode === 'detalle')
  const items = real?.movements ?? movimientos
  const totalThisMonth = real?.totalThisMonth ?? totalMovementsThisMonth

  return (
    <Card className="flex flex-col gap-4" padding="lg">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl font-semibold text-ink">Últimos movimientos</h2>
        <Link to="/movimientos" className="border-b border-green text-base font-semibold text-green">
          {real ? 'Ver todos los movimientos' : `Ver los ${totalThisMonth} del mes`}
        </Link>
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full border-collapse tabular">
          <thead>
            <tr>
              <th className={`${TH} whitespace-nowrap`}>Fecha</th>
              <th className={`${TH} whitespace-nowrap`}>Comercio</th>
              <th className={`${TH} whitespace-nowrap`}>Categoría</th>
              {isDetalle && (
                <>
                  <th className={`${TH} whitespace-nowrap`}>Cuenta</th>
                  <th className={`${TH} whitespace-nowrap`}>Estado</th>
                </>
              )}
              <th className="border-b border-line pb-2.5 text-right text-[13px] font-semibold whitespace-nowrap tracking-[0.06em] text-ink-muted uppercase">
                Importe
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((m) => (
              <tr key={`${m.fecha}-${m.comercio}`}>
                <td className={`${TD} whitespace-nowrap text-ink-muted`}>{m.fecha}</td>
                <td className={`${TD} whitespace-nowrap font-semibold text-ink`}>{m.comercio}</td>
                <td className={`${TD} whitespace-nowrap text-ink-muted`}>{m.categoria}</td>
                {isDetalle && (
                  <>
                    <td className={`${TD} whitespace-nowrap text-ink-muted`}>{m.cuenta}</td>
                    <td className={`${TD} whitespace-nowrap text-ink-muted`}>{m.estado}</td>
                  </>
                )}
                <td className="border-b border-[#f0f3f1] py-3 text-right text-[17px] font-bold whitespace-nowrap">
                  <Money value={m.importe} signed={m.importe > 0} tone={toneFor(m)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2.5 lg:hidden">
        {items.map((m) => (
          <div
            key={`${m.fecha}-${m.comercio}`}
            className="flex items-center justify-between gap-3 rounded-2xl border border-line p-3.5 tabular"
          >
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-ink">{m.comercio}</div>
              <div className="mt-0.5 truncate text-sm text-ink-muted">
                {m.fecha} · {m.categoria}
                {isDetalle && ` · ${m.cuenta} · ${m.estado}`}
              </div>
            </div>
            <Money
              value={m.importe}
              signed={m.importe > 0}
              tone={toneFor(m)}
              className="shrink-0 whitespace-nowrap text-[17px] font-bold"
            />
          </div>
        ))}
      </div>
    </Card>
  )
}
