import type { KeyboardEvent } from 'react'
import { Badge, type BadgeVariant } from '../../components/Badge'
import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { accounts, type Account, type AccountFunction } from '../../data/accounts'
import { useAccountsStore } from './store'

const FUNCTION_BADGE: Record<AccountFunction, BadgeVariant> = {
  'Para gastar': 'success',
  Ahorro: 'info',
  Inversión: 'plum',
  Deuda: 'danger',
  'Activo manual': 'neutral',
  'Por confirmar': 'pending',
}

function Row({ account }: { account: Account }) {
  const openPanel = useAccountsStore((s) => s.openPanel)

  function handleKeyDown(e: KeyboardEvent<HTMLTableRowElement>) {
    if (e.key === 'Enter') openPanel(account.id)
  }

  return (
    <tr
      tabIndex={0}
      role="button"
      data-row-id={account.id}
      aria-label={`Ver detalle de ${account.name}`}
      onClick={() => openPanel(account.id)}
      onKeyDown={handleKeyDown}
      className="cursor-pointer bg-surface"
    >
      <td className="border-b border-[#f0f3f1] py-3.5 pr-4 text-[17px] font-semibold whitespace-nowrap text-ink">
        {account.name}
        {account.foreign && (
          <span className="ml-1.5 text-sm font-normal text-ink-muted">
            · {account.foreign.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} {account.foreign.currency}
          </span>
        )}
      </td>
      <td className="border-b border-[#f0f3f1] py-3.5 pr-4">
        <div className="flex items-center gap-2">
          <Badge variant={FUNCTION_BADGE[account.fn]} size="sm">
            {account.fn}
          </Badge>
          {account.fn === 'Por confirmar' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                openPanel(account.id)
              }}
              className="inline-flex min-h-11 items-center rounded-md border border-green px-3 text-sm font-semibold whitespace-nowrap text-green"
            >
              Asignar función
            </button>
          )}
        </div>
      </td>
      <td className="border-b border-[#f0f3f1] py-3.5 pr-4 text-base whitespace-nowrap text-ink-muted">
        {account.foreign
          ? `Revolut · tipo ${account.foreign.rate.toLocaleString('es-ES', { minimumFractionDigits: 4 })} (${account.foreign.rateDate})`
          : account.institution}
      </td>
      <td className="border-b border-[#f0f3f1] py-3.5 text-right text-[17px] font-bold whitespace-nowrap">
        <Money value={account.balance} tone={account.balance < 0 ? 'danger' : 'ink'} />
      </td>
    </tr>
  )
}

const TH = 'border-b border-line pb-2.5 pr-4 text-left text-[13px] font-semibold tracking-[0.06em] text-ink-muted uppercase'

function MobileCard({ account }: { account: Account }) {
  const openPanel = useAccountsStore((s) => s.openPanel)

  return (
    <div
      tabIndex={0}
      role="button"
      aria-label={`Ver detalle de ${account.name}`}
      onClick={() => openPanel(account.id)}
      onKeyDown={(e) => e.key === 'Enter' && openPanel(account.id)}
      className="flex cursor-pointer flex-col gap-2 rounded-2xl border border-line bg-surface p-3.5 tabular"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-[17px] font-semibold text-ink">
          {account.name}
          {account.foreign && (
            <span className="ml-1.5 text-sm font-normal text-ink-muted">
              · {account.foreign.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })} {account.foreign.currency}
            </span>
          )}
        </div>
        <Money value={account.balance} tone={account.balance < 0 ? 'danger' : 'ink'} className="shrink-0 whitespace-nowrap text-[17px] font-bold" />
      </div>
      <div className="text-sm text-ink-muted">
        {account.foreign
          ? `Revolut · tipo ${account.foreign.rate.toLocaleString('es-ES', { minimumFractionDigits: 4 })} (${account.foreign.rateDate})`
          : account.institution}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={FUNCTION_BADGE[account.fn]} size="sm">
          {account.fn}
        </Badge>
        {account.fn === 'Por confirmar' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              openPanel(account.id)
            }}
            className="inline-flex min-h-11 items-center rounded-md border border-green px-3 text-sm font-semibold whitespace-nowrap text-green"
          >
            Asignar función
          </button>
        )}
      </div>
    </div>
  )
}

/** Tabla de cuentas por función; tarjetas de fila por debajo de 1024 px. Cada fila abre el panel de detalle. */
export function AccountsTable() {
  return (
    <Card padding="lg" className="flex flex-col gap-5">
      <h2 className="font-serif text-2xl font-semibold text-ink">Tus cuentas por función</h2>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[680px] border-collapse tabular">
          <thead>
            <tr>
              <th className={TH}>Cuenta</th>
              <th className={TH}>Función</th>
              <th className={TH}>Institución</th>
              <th className="border-b border-line pb-2.5 text-right text-[13px] font-semibold tracking-[0.06em] text-ink-muted uppercase">
                Saldo
              </th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <Row key={a.id} account={a} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2.5 lg:hidden">
        {accounts.map((a) => (
          <MobileCard key={a.id} account={a} />
        ))}
      </div>
    </Card>
  )
}
