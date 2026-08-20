import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { positions } from '../../data/investments'
import { useInvestmentsStore } from './store'

const TH = 'border-b border-line pb-2.5 text-right text-[13px] font-semibold tracking-[0.06em] text-ink-muted uppercase'
const TD = 'border-b border-[#f0f3f1] py-3.5 text-right text-base whitespace-nowrap'

const totalValue = positions.reduce((sum, p) => sum + p.value, 0)

/** Bloque 2 — Posiciones. En Detalle añade aportado y peso en cartera. */
export function PositionsTable() {
  const isDetalle = useInvestmentsStore((s) => s.mode === 'detalle')

  return (
    <Card padding="lg" className="flex flex-col gap-4">
      <h2 className="font-serif text-2xl font-semibold text-ink">Posiciones</h2>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[640px] border-collapse tabular">
          <thead>
            <tr>
              <th className="border-b border-line pb-2.5 text-left text-[13px] font-semibold tracking-[0.06em] text-ink-muted uppercase">
                Posición
              </th>
              <th className={TH}>Unidades</th>
              <th className={TH}>Coste medio</th>
              {isDetalle && <th className={TH}>Aportado</th>}
              <th className={TH}>Valor</th>
              {isDetalle && <th className={TH}>Peso en cartera</th>}
              <th className={TH}>Rentabilidad</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => (
              <tr key={p.id}>
                <td className="border-b border-[#f0f3f1] py-3.5 text-[17px] font-semibold whitespace-nowrap text-ink">
                  {p.name}
                </td>
                <td className={`${TD} text-ink-muted`}>
                  {p.units !== null ? p.units.toLocaleString('es-ES', { minimumFractionDigits: 2 }) : '—'}
                </td>
                <td className={`${TD} text-ink-muted`}>{p.avgCost !== null ? <Money value={p.avgCost} /> : '—'}</td>
                {isDetalle && (
                  <td className={`${TD} text-ink-muted`}>
                    <Money value={p.contributed} />
                  </td>
                )}
                <td className={`${TD} font-bold text-ink`}>
                  <Money value={p.value} />
                </td>
                {isDetalle && (
                  <td className={`${TD} text-ink-muted`}>
                    {((p.value / totalValue) * 100).toLocaleString('es-ES', { maximumFractionDigits: 0 })} %
                  </td>
                )}
                <td className={`${TD} font-bold text-green`}>
                  <div className="flex flex-col items-end leading-tight">
                    <Money value={p.gain} signed tone="green" />
                    <span className="text-[13px] font-semibold">
                      +{p.gainPct.toLocaleString('es-ES', { minimumFractionDigits: 1 })} %
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2.5 lg:hidden">
        {positions.map((p) => (
          <div key={p.id} className="flex flex-col gap-2 rounded-2xl border border-line p-3.5 tabular">
            <div className="flex items-start justify-between gap-3">
              <div className="text-[17px] font-semibold text-ink">{p.name}</div>
              <div className="flex shrink-0 flex-col items-end leading-tight">
                <Money value={p.value} className="font-bold text-ink" />
                <span className="text-[13px] font-semibold text-green">
                  <Money value={p.gain} signed tone="green" /> · +
                  {p.gainPct.toLocaleString('es-ES', { minimumFractionDigits: 1 })} %
                </span>
              </div>
            </div>
            <div className="text-sm text-ink-muted">
              {p.units !== null ? `${p.units.toLocaleString('es-ES', { minimumFractionDigits: 2 })} uds.` : 'Sin unidades'}
              {p.avgCost !== null && (
                <>
                  {' '}
                  · coste medio <Money value={p.avgCost} />
                </>
              )}
            </div>
            {isDetalle && (
              <div className="text-sm text-ink-muted">
                Aportado <Money value={p.contributed} /> · {((p.value / totalValue) * 100).toLocaleString('es-ES', { maximumFractionDigits: 0 })} % de la cartera
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
