import * as Dialog from '@radix-ui/react-dialog'
import { useRef } from 'react'
import { Money } from '../../components/Money'
import { SectionLabel } from '../../components/SectionLabel'
import { SidePanel } from '../../components/SidePanel'
import { accounts as demoAccounts, type Account } from '../../data/accounts'
import { focusRowById } from '../../lib/dom'
import { useAccountsStore } from './store'

function PanelContent({ account }: { account: Account }) {
  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <SectionLabel>Detalle de cuenta</SectionLabel>
          <Dialog.Title className="mt-1 font-serif text-[28px] font-semibold text-ink">{account.name}</Dialog.Title>
        </div>
        <Dialog.Close asChild>
          <button
            type="button"
            aria-label="Cerrar panel"
            className="flex h-11 w-11 items-center justify-center rounded-md border border-line bg-surface text-lg text-ink"
          >
            ✕
          </button>
        </Dialog.Close>
      </div>

      <Dialog.Description className="sr-only">
        Saldo, función, movimientos recientes y acciones de esta cuenta.
      </Dialog.Description>

      <Money value={account.balance} tone={account.balance < 0 ? 'danger' : 'ink'} serif className="text-[40px] font-semibold" />
      <div className="text-base text-ink-muted">
        {account.foreign
          ? `${account.foreign.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} ${account.foreign.currency} al tipo ${account.foreign.rate.toLocaleString('es-ES', { minimumFractionDigits: 4 })} · actualizado ${account.foreign.rateDate}, 08:42`
          : `Actualizado 19 ago, 08:42`}
      </div>

      <div className="flex flex-col gap-2 rounded-[14px] border border-line p-4">
        <div className="flex justify-between text-[15px] text-ink-muted">
          <span>Función</span>
          <span className="font-semibold text-ink">{account.fn}</span>
        </div>
        <div className="flex justify-between text-[15px] text-ink-muted">
          <span>Institución</span>
          <span className="font-semibold text-ink">{account.institution}</span>
        </div>
        <div className="flex justify-between text-[15px] text-ink-muted">
          <span>Divisa</span>
          <span className="font-semibold text-ink">{account.foreign?.currency ?? 'EUR'}</span>
        </div>
        <div className="flex justify-between text-[15px] text-ink-muted">
          <span>Cuenta en Disponible hoy</span>
          <span className={`font-semibold ${account.countsInAvailableToday ? 'text-green-text' : 'text-ink'}`}>
            {account.countsInAvailableToday ? 'Sí' : 'No'}
          </span>
        </div>
      </div>

      <h3 className="mt-2 text-[17px] font-bold text-ink">Movimientos recientes</h3>
      {account.recentMovements.length === 0 ? (
        <p className="text-[15px] text-ink-muted">Sin movimientos recientes.</p>
      ) : (
        <div className="flex flex-col gap-2.5 tabular">
          {account.recentMovements.map((m) => (
            <div key={`${m.date}-${m.label}`} className="flex justify-between text-[15px]">
              <span className="text-ink">
                {m.date} · {m.label}
              </span>
              <Money value={m.amount} tone={m.amount > 0 ? 'green' : 'ink'} signed={m.amount > 0} className="font-bold" />
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2.5">
        <button
          type="button"
          className="min-h-11 rounded-md border border-line px-4 py-2.5 text-base font-semibold text-ink"
        >
          Cambiar función
        </button>
        <button
          type="button"
          className="min-h-11 rounded-md border border-line px-4 py-2.5 text-base font-semibold text-ink"
        >
          Renombrar
        </button>
        <button
          type="button"
          className="min-h-11 rounded-md border border-line px-4 py-2.5 text-base font-semibold text-danger-text"
        >
          Desconectar
        </button>
      </div>
    </>
  )
}

/** Panel lateral de detalle de cuenta: se abre al hacer click en una fila. */
export function AccountDetailPanel({ accounts = demoAccounts }: { accounts?: Account[] }) {
  const accountId = useAccountsStore((s) => s.panelAccountId)
  const closePanel = useAccountsStore((s) => s.closePanel)
  const account = accounts.find((a) => a.id === accountId) ?? null

  // Recuerda qué fila abrió el panel para devolverle el foco al cerrar,
  // incluso después de que el store limpie panelAccountId.
  const lastOpenedId = useRef<string | null>(null)
  if (accountId) lastOpenedId.current = accountId

  return (
    <SidePanel
      open={account !== null}
      onOpenChange={(open) => !open && closePanel()}
      onCloseAutoFocus={(event) => {
        event.preventDefault()
        const id = lastOpenedId.current
        setTimeout(() => focusRowById(id), 0)
      }}
    >
      {account && <PanelContent key={account.id} account={account} />}
    </SidePanel>
  )
}
