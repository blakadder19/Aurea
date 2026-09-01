import { useState } from 'react'
import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { formatIsoDayMonth } from '../../lib/format'
import type { TransferCandidate } from '../../lib/internalTransfers'
import { confirmInternalTransfer, dismissInternalTransfer } from './useInternalTransfers'
import { updateTransactionReimbursement } from './useRealTransactions'

function CandidateRow({
  candidate,
  categoryIdOf,
  onResolved,
}: {
  candidate: TransferCandidate
  /** Categoría del cargo emparejado — la que hereda el reembolso para restar del sitio correcto. */
  categoryIdOf: (transactionId: string) => string | undefined
  onResolved: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { outgoing, incoming } = candidate

  async function run(action: () => Promise<string | null>) {
    setBusy(true)
    setError(null)
    const err = await action()
    setBusy(false)
    if (err) setError(err)
    else onResolved()
  }

  return (
    <div className="flex flex-col gap-2 border-b border-[#f0f3f1] py-3 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <Money value={Math.abs(outgoing.amountCents) / 100} decimals={2} className="text-[17px] font-bold text-ink" />
          </div>
          <div className="text-[15px] text-ink-muted">
            <span className="text-danger-text">−</span> {outgoing.description} · {formatIsoDayMonth(outgoing.dateISO)}
          </div>
          <div className="text-[15px] text-ink-muted">
            <span className="text-green-text">+</span> {incoming.description} · {formatIsoDayMonth(incoming.dateISO)}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(() => confirmInternalTransfer(outgoing.id, incoming.id))}
            className="min-h-9 rounded-md border border-brand bg-brand px-3 text-[15px] font-semibold text-surface hover:bg-brand-hover disabled:opacity-60"
          >
            Sí, es un traspaso
          </button>
          <button
            type="button"
            disabled={busy}
            title="Te devuelven parte de este gasto: restará del gasto en vez de contar como ingreso"
            onClick={() =>
              void run(async () => {
                const err = await updateTransactionReimbursement(incoming.id, true, categoryIdOf(outgoing.id))
                return err ?? (await dismissInternalTransfer(outgoing.id, incoming.id))
              })
            }
            className="min-h-9 rounded-md border border-brand bg-surface px-3 text-[15px] font-semibold text-brand hover:bg-brand-soft disabled:opacity-60"
          >
            Es un reembolso
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void run(() => dismissInternalTransfer(outgoing.id, incoming.id))}
            className="min-h-9 rounded-md border border-line bg-surface px-3 text-[15px] font-semibold text-ink hover:bg-canvas disabled:opacity-60"
          >
            Ninguna
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-danger-text">{error}</p>}
    </div>
  )
}

/**
 * Parejas +X/−X que parecen dinero tuyo cambiando de cuenta. Nunca se
 * marcan solas: un reembolso de un tercero encaja igual de bien en importe
 * y fecha, y darlo por hecho borraría un gasto real.
 *
 * Aquí hubo un botón "Marcar las N seguras" que confirmaba en lote las
 * parejas de confianza 'alta'. Se quitó el 1 sep 2026 tras auditar datos
 * reales: de las 5 parejas confirmadas, 3 estaban mal, y las 3 se habrían
 * marcado solas porque el detector las daba por 'alta'. Dos eran el adelanto
 * que el usuario hace por su compañero de piso (dinero que sale de su cuenta
 * pero no es suyo, indistinguible del traspaso propio salvo por el importe) y
 * una emparejaba −200 EUR con +200 PLN, porque el emparejador compara
 * `amountCents` sin mirar la divisa.
 *
 * No volver a poner una acción en lote mientras el detector no distinga
 * divisas y no exista forma de declarar el dinero adelantado por otro.
 *
 * También se quitó la insignia "Casi seguro" / "Puede ser un reembolso" de
 * cada fila, por el mismo motivo: hacía la misma promesa de una en una. Y la
 * señal que la sostenía no informa — `confidence` sube a 'alta' cuando las
 * descripciones coinciden a ambos lados, cosa que en un traspaso real pasa
 * SIEMPRE (un cambio de divisa etiqueta las dos patas igual). Decía "esto
 * parece dinero moviéndose entre tus cuentas", que es cierto y no es la
 * pregunta: las tres parejas mal eran dinero moviéndose entre sus cuentas.
 *
 * `confidence` sigue existiendo en el motor porque ordena qué parejas se
 * forman primero (`detectInternalTransferCandidates`); quitarlo cambiaría el
 * emparejamiento. Lo que se quita es la promesa en pantalla.
 */
export function InternalTransfersCard({
  candidates,
  categoryIdOf,
  onResolved,
}: {
  candidates: TransferCandidate[]
  categoryIdOf: (transactionId: string) => string | undefined
  onResolved: () => void
}) {
  if (candidates.length === 0) return null

  return (
    <Card padding="lg" className="flex flex-col gap-3">
      <div>
        <h2 className="font-serif text-[22px] lg:text-[19px] font-semibold text-ink">Dinero tuyo cambiando de cuenta</h2>
        <p className="max-w-[70ch] text-[15px] text-ink-muted">
          {candidates.length} pareja{candidates.length === 1 ? '' : 's'} de cargo y abono del mismo importe entre dos cuentas tuyas. Si es un
          traspaso, no es ni gasto ni ingreso — y hoy se está contando como las dos cosas, inflando tus cifras.
        </p>
      </div>
      <div className="flex flex-col">
        {candidates.map((c) => (
          <CandidateRow key={`${c.outgoing.id}::${c.incoming.id}`} candidate={c} categoryIdOf={categoryIdOf} onResolved={onResolved} />
        ))}
      </div>
    </Card>
  )
}
