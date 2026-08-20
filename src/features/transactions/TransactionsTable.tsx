import type { KeyboardEvent } from 'react'
import { Money } from '../../components/Money'
import { transactions, type Transaction } from '../../data/transactions'
import { useTransactionsStore } from './store'

function toneFor(t: Transaction) {
  if (t.importe > 0) return 'green' as const
  if (t.categoria === 'Sin clasificar') return 'danger' as const
  return 'ink' as const
}

const TH = 'border-b border-line px-0 py-3.5 text-left text-[13px] font-semibold tracking-[0.06em] text-ink-muted uppercase'

function Row({ transaction }: { transaction: Transaction }) {
  const isSelected = useTransactionsStore((s) => s.selectedIds.has(transaction.id))
  const toggleSelected = useTransactionsStore((s) => s.toggleSelected)
  const openPanel = useTransactionsStore((s) => s.openPanel)

  function handleKeyDown(e: KeyboardEvent<HTMLTableRowElement>) {
    if (e.key === 'Enter') openPanel(transaction.id)
  }

  return (
    <tr
      tabIndex={0}
      role="button"
      data-row-id={transaction.id}
      aria-label={`Editar movimiento de ${transaction.comercio}`}
      onClick={() => openPanel(transaction.id)}
      onKeyDown={handleKeyDown}
      className={`cursor-pointer ${isSelected ? 'bg-canvas' : 'bg-surface'}`}
    >
      <td className="border-b border-[#f0f3f1] py-3.5 pl-5">
        <div className="flex h-11 w-11 items-center justify-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelected(transaction.id)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Seleccionar movimiento de ${transaction.comercio}`}
            className="h-5 w-5"
          />
        </div>
      </td>
      <td className="border-b border-[#f0f3f1] py-3.5 pr-4 text-base whitespace-nowrap text-ink-muted">
        {transaction.fecha}
      </td>
      <td className="border-b border-[#f0f3f1] py-3.5 pr-4 text-base font-semibold whitespace-nowrap text-ink">
        {transaction.comercio}
      </td>
      <td className="border-b border-[#f0f3f1] py-3.5 pr-4 text-base whitespace-nowrap text-ink-muted">
        {transaction.cuenta}
      </td>
      <td className="border-b border-[#f0f3f1] py-3.5 pr-4">
        <span className="rounded-full border border-line bg-canvas px-2.5 py-[5px] text-sm font-semibold whitespace-nowrap text-ink">
          {transaction.categoria}
        </span>
      </td>
      <td className="border-b border-[#f0f3f1] py-3.5 pr-5 text-right text-[17px] font-bold whitespace-nowrap">
        <Money value={transaction.importe} signed={transaction.importe > 0} tone={toneFor(transaction)} />
      </td>
    </tr>
  )
}

/** Tabla de movimientos con selección múltiple. Busca en vivo por comercio. */
export function TransactionsTable() {
  const searchQuery = useTransactionsStore((s) => s.searchQuery)
  const selectedIds = useTransactionsStore((s) => s.selectedIds)
  const setSelectedIds = useTransactionsStore((s) => s.setSelectedIds)
  const clearSelection = useTransactionsStore((s) => s.clearSelection)

  const query = searchQuery.trim().toLowerCase()
  const filtered = query ? transactions.filter((t) => t.comercio.toLowerCase().includes(query)) : transactions
  const allFilteredSelected = filtered.length > 0 && filtered.every((t) => selectedIds.has(t.id))

  return (
    <div className="shrink-0 overflow-hidden rounded-card border border-line bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse tabular">
          <thead>
            <tr className="bg-canvas">
              <th className="border-b border-line py-3.5 pl-5">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={() => (allFilteredSelected ? clearSelection() : setSelectedIds(filtered.map((t) => t.id)))}
                  aria-label="Seleccionar todo"
                  className="h-5 w-5"
                />
              </th>
              <th className={`${TH} pr-4`}>Fecha</th>
              <th className={`${TH} pr-4`}>Comercio</th>
              <th className={`${TH} pr-4`}>Cuenta</th>
              <th className={`${TH} pr-4`}>Categoría</th>
              <th className="border-b border-line py-3.5 pr-5 text-right text-[13px] font-semibold tracking-[0.06em] text-ink-muted uppercase">
                Importe
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <Row key={t.id} transaction={t} />
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="px-5 py-16 text-center text-base text-ink-muted">
            Ningún movimiento coincide con «{searchQuery}».
          </div>
        )}
      </div>
    </div>
  )
}
