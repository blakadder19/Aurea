import { useState } from 'react'
import { filterAccounts, filterCategories } from '../../data/transactions'
import { ALL_ACCOUNTS, ALL_CATEGORIES, useTransactionsStore } from './store'

const SELECT_CLASSES =
  'min-h-11 rounded-md border border-line bg-surface px-3 py-2.5 text-[15px] text-ink'

/**
 * Buscador + filtros de Cuenta y Categoría (filtran de verdad, en demo y en
 * real). Fecha y Estado siguen siendo cosméticos: no hay un equivalente
 * real claro todavía (un movimiento sincronizado del banco no tiene un
 * "estado" binario, y "Este mes" no encaja con la ventana de sincronización).
 */
export function FilterBar({
  accounts = filterAccounts,
  categories = filterCategories,
}: {
  accounts?: string[]
  categories?: string[]
}) {
  const searchQuery = useTransactionsStore((s) => s.searchQuery)
  const setSearchQuery = useTransactionsStore((s) => s.setSearchQuery)
  const account = useTransactionsStore((s) => s.accountFilter)
  const setAccount = useTransactionsStore((s) => s.setAccountFilter)
  const category = useTransactionsStore((s) => s.categoryFilter)
  const setCategory = useTransactionsStore((s) => s.setCategoryFilter)

  const [date, setDate] = useState('Este mes')
  const [status, setStatus] = useState('Cualquier estado')

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface p-4 px-5">
      <input
        aria-label="Buscar movimientos"
        placeholder="Buscar por comercio, importe o nota"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="min-h-11 min-w-[260px] flex-1 rounded-md border border-line px-3.5 py-[11px] text-base text-ink"
      />
      <select
        aria-label="Filtrar por fecha"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className={SELECT_CLASSES}
      >
        <option>Este mes</option>
      </select>
      <select
        aria-label="Filtrar por cuenta"
        value={account}
        onChange={(e) => setAccount(e.target.value)}
        className={SELECT_CLASSES}
      >
        <option>{ALL_ACCOUNTS}</option>
        {accounts.map((a) => (
          <option key={a}>{a}</option>
        ))}
      </select>
      <select
        aria-label="Filtrar por categoría"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className={SELECT_CLASSES}
      >
        <option>{ALL_CATEGORIES}</option>
        {categories.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <select
        aria-label="Filtrar por estado"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className={SELECT_CLASSES}
      >
        <option>Cualquier estado</option>
        <option>Confirmado</option>
        <option>Requiere revisión</option>
      </select>
    </div>
  )
}
