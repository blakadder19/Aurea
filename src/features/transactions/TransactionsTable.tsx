import type { KeyboardEvent } from 'react'
import { Money } from '../../components/Money'
import { NoSearchResults } from '../../components/states/NoSearchResults'
import { transactions as demoTransactions, type Transaction } from '../../data/transactions'
import { categoryColorClass } from '../../lib/categoryColor'
import { formatMoney } from '../../lib/format'
import { ALL_ACCOUNTS, ALL_CATEGORIES, ALL_STATUSES, STATUS_NEEDS_REVIEW, useTransactionsStore } from './store'

/** Lo que se muestra como comercio: el nombre personal si lo has puesto, si no lo que dice el banco. */
export function displayLabelFor(t: Transaction): string {
  return t.displayName || t.comercio
}

/** El buscador promete "comercio, importe o nota" (y etiquetas) — que de verdad las mire todas, no solo el comercio. */
export function matchesSearch(t: Transaction, query: string): boolean {
  if (!query) return true
  if (t.comercio.toLowerCase().includes(query)) return true
  if ((t.displayName ?? '').toLowerCase().includes(query)) return true
  if (formatMoney(Math.abs(t.importe)).toLowerCase().includes(query)) return true
  if ((t.userNote ?? '').toLowerCase().includes(query)) return true
  if ((t.tags ?? []).some((tag) => tag.toLowerCase().includes(query))) return true
  return false
}

function toneFor(t: Transaction) {
  if (t.importe > 0) return 'green' as const
  if (t.categoria === 'Sin clasificar') return 'danger' as const
  return 'ink' as const
}

function Avatar({ transaction }: { transaction: Transaction }) {
  return (
    <div
      aria-hidden="true"
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-surface ${categoryColorClass(transaction.categoria)}`}
    >
      {displayLabelFor(transaction).charAt(0).toUpperCase()}
    </div>
  )
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
      <td className="border-b border-[#f0f3f1] py-3.5 pr-3">
        <Avatar transaction={transaction} />
      </td>
      <td className="border-b border-[#f0f3f1] py-3.5 pr-4 text-base whitespace-nowrap text-ink-muted">
        {transaction.fecha}
      </td>
      <td className="max-w-[240px] border-b border-[#f0f3f1] py-3.5 pr-4 text-base font-semibold text-ink">
        {/* title siempre muestra lo que dice el banco, aunque el texto visible sea el nombre personal */}
        <div className="truncate" title={transaction.comercio}>
          {displayLabelFor(transaction)}
        </div>
        {transaction.tags && transaction.tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {transaction.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-canvas px-2 py-0.5 text-[12px] font-medium text-ink-muted">
                {tag}
              </span>
            ))}
          </div>
        )}
      </td>
      <td className="max-w-[190px] truncate border-b border-[#f0f3f1] py-3.5 pr-4 text-base text-ink-muted" title={transaction.cuenta}>
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

function MobileCard({ transaction }: { transaction: Transaction }) {
  const isSelected = useTransactionsStore((s) => s.selectedIds.has(transaction.id))
  const toggleSelected = useTransactionsStore((s) => s.toggleSelected)
  const openPanel = useTransactionsStore((s) => s.openPanel)

  return (
    <div
      tabIndex={0}
      role="button"
      data-row-id={transaction.id}
      aria-label={`Editar movimiento de ${transaction.comercio}`}
      onClick={() => openPanel(transaction.id)}
      onKeyDown={(e) => e.key === 'Enter' && openPanel(transaction.id)}
      className={`flex cursor-pointer items-center gap-3 rounded-2xl border border-line p-3.5 tabular ${
        isSelected ? 'bg-canvas' : 'bg-surface'
      }`}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleSelected(transaction.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Seleccionar movimiento de ${transaction.comercio}`}
          className="h-5 w-5"
        />
      </div>
      <Avatar transaction={transaction} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-semibold text-ink">{displayLabelFor(transaction)}</div>
        <div className="mt-0.5 truncate text-sm text-ink-muted">
          {transaction.fecha} · {transaction.categoria} · {transaction.cuenta}
        </div>
        {transaction.tags && transaction.tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {transaction.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-canvas px-2 py-0.5 text-[12px] font-medium text-ink-muted">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <Money
        value={transaction.importe}
        signed={transaction.importe > 0}
        tone={toneFor(transaction)}
        className="shrink-0 whitespace-nowrap text-[17px] font-bold"
      />
    </div>
  )
}

/** Tabla de movimientos con selección múltiple; tarjetas de fila por debajo de 1024 px. Busca y filtra en vivo. */
export function TransactionsTable({ transactions = demoTransactions }: { transactions?: Transaction[] }) {
  const searchQuery = useTransactionsStore((s) => s.searchQuery)
  const setSearchQuery = useTransactionsStore((s) => s.setSearchQuery)
  const accountFilter = useTransactionsStore((s) => s.accountFilter)
  const setAccountFilter = useTransactionsStore((s) => s.setAccountFilter)
  const categoryFilter = useTransactionsStore((s) => s.categoryFilter)
  const setCategoryFilter = useTransactionsStore((s) => s.setCategoryFilter)
  const statusFilter = useTransactionsStore((s) => s.statusFilter)
  const setStatusFilter = useTransactionsStore((s) => s.setStatusFilter)
  const selectedIds = useTransactionsStore((s) => s.selectedIds)
  const setSelectedIds = useTransactionsStore((s) => s.setSelectedIds)
  const clearSelection = useTransactionsStore((s) => s.clearSelection)

  const query = searchQuery.trim().toLowerCase()
  const filtered = transactions.filter(
    (t) =>
      matchesSearch(t, query) &&
      (accountFilter === ALL_ACCOUNTS || t.cuenta === accountFilter) &&
      (categoryFilter === ALL_CATEGORIES || t.categoria === categoryFilter) &&
      (statusFilter === ALL_STATUSES || Boolean(t.needsReview) === (statusFilter === STATUS_NEEDS_REVIEW)),
  )
  const allFilteredSelected = filtered.length > 0 && filtered.every((t) => selectedIds.has(t.id))

  if (filtered.length === 0) {
    return (
      <div className="shrink-0">
        <NoSearchResults
          query={searchQuery}
          onClearFilters={() => {
            setSearchQuery('')
            setAccountFilter(ALL_ACCOUNTS)
            setCategoryFilter(ALL_CATEGORIES)
            setStatusFilter(ALL_STATUSES)
          }}
        />
      </div>
    )
  }

  return (
    <>
      <div className="hidden shrink-0 overflow-hidden rounded-card border border-line bg-surface lg:block">
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
                <th className="border-b border-line py-3.5 pr-3" aria-hidden="true"></th>
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
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-2.5 lg:hidden">
        {filtered.map((t) => (
          <MobileCard key={t.id} transaction={t} />
        ))}
      </div>
    </>
  )
}
