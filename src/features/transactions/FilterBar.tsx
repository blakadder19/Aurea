import { useState } from 'react'
import { filterAccounts, filterCategories } from '../../data/transactions'
import { useTransactionsStore } from './store'

const SELECT_CLASSES =
  'min-h-11 rounded-md border border-line bg-surface px-3 py-2.5 text-[15px] text-ink'

/**
 * Buscador (filtra de verdad por comercio) + 4 selects reales con estado
 * que no filtran todavía (llegan en cortes posteriores).
 */
export function FilterBar() {
  const searchQuery = useTransactionsStore((s) => s.searchQuery)
  const setSearchQuery = useTransactionsStore((s) => s.setSearchQuery)

  const [date, setDate] = useState('Este mes')
  const [account, setAccount] = useState('Todas las cuentas')
  const [category, setCategory] = useState('Todas las categorías')
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
        <option>Todas las cuentas</option>
        {filterAccounts.map((a) => (
          <option key={a}>{a}</option>
        ))}
      </select>
      <select
        aria-label="Filtrar por categoría"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className={SELECT_CLASSES}
      >
        <option>Todas las categorías</option>
        {filterCategories.map((c) => (
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
