import { useState } from 'react'
import { filterAccounts, filterCategories, type TransactionTag } from '../../data/transactions'
import { formatIsoMonthYear } from '../../lib/format'
import {
  ALL_ACCOUNTS,
  ALL_CATEGORIES,
  ALL_STATUSES,
  ALL_TAGS,
  DATE_ALL,
  DATE_LAST_3_MONTHS,
  DATE_THIS_MONTH,
  STATUS_CONFIRMED,
  STATUS_NEEDS_REVIEW,
  useTransactionsStore,
} from './store'

const KNOWN_DATE_FILTERS = new Set([DATE_ALL, DATE_THIS_MONTH, DATE_LAST_3_MONTHS])
const ISO_MONTH_RE = /^\d{4}-\d{2}$/

const SELECT_CLASSES =
  'min-h-11 rounded-md border border-line bg-surface px-3 py-2.5 text-[15px] text-ink'

/**
 * Buscador + filtros de Cuenta, Categoría, Estado y Fecha (filtran de
 * verdad, en demo y en real — "Requiere revisión" usa el mismo
 * `needsReview` que ya alimenta el Centro de revisión). En real, Fecha
 * corta de verdad sobre lo ya cargado; en demo se queda en su único "Este
 * mes" cosmético — un solo mes de datos fijos no necesita más.
 */
export function FilterBar({
  accounts = filterAccounts,
  categories = filterCategories,
  tags = [],
  isReal = false,
}: {
  accounts?: string[]
  categories?: string[]
  /** El catálogo de etiquetas del usuario (tabla `tags`). Vacío = no se enseña el filtro. */
  tags?: TransactionTag[]
  isReal?: boolean
}) {
  const searchQuery = useTransactionsStore((s) => s.searchQuery)
  const setSearchQuery = useTransactionsStore((s) => s.setSearchQuery)
  const account = useTransactionsStore((s) => s.accountFilter)
  const setAccount = useTransactionsStore((s) => s.setAccountFilter)
  const category = useTransactionsStore((s) => s.categoryFilter)
  const setCategory = useTransactionsStore((s) => s.setCategoryFilter)
  const status = useTransactionsStore((s) => s.statusFilter)
  const setStatus = useTransactionsStore((s) => s.setStatusFilter)
  const dateFilter = useTransactionsStore((s) => s.dateFilter)
  const setDateFilter = useTransactionsStore((s) => s.setDateFilter)
  const tag = useTransactionsStore((s) => s.tagFilter)
  const setTag = useTransactionsStore((s) => s.setTagFilter)

  const [demoDate, setDemoDate] = useState(DATE_THIS_MONTH)

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface p-4 px-5">
      <input
        aria-label="Buscar movimientos"
        placeholder="Buscar por comercio, importe o nota"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="min-h-11 min-w-[260px] flex-1 rounded-md border border-line px-3.5 py-[11px] text-base text-ink"
      />
      {isReal ? (
        <select
          aria-label="Filtrar por fecha"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className={SELECT_CLASSES}
        >
          <option>{DATE_ALL}</option>
          <option>{DATE_THIS_MONTH}</option>
          <option>{DATE_LAST_3_MONTHS}</option>
          {/* Llega desde un enlace "Ver movimientos" de Informes con un mes concreto — no es una opción elegible a mano. */}
          {ISO_MONTH_RE.test(dateFilter) && !KNOWN_DATE_FILTERS.has(dateFilter) && <option value={dateFilter}>{formatIsoMonthYear(dateFilter)}</option>}
        </select>
      ) : (
        <select
          aria-label="Filtrar por fecha"
          value={demoDate}
          onChange={(e) => setDemoDate(e.target.value)}
          className={SELECT_CLASSES}
        >
          <option>{DATE_THIS_MONTH}</option>
        </select>
      )}
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
        {/* Llega desde un enlace "Ver movimientos" de Informes con una categoría concreta que no está (todavía) en la lista de arriba. */}
        {category !== ALL_CATEGORIES && !categories.includes(category) && <option value={category}>{category}</option>}
      </select>
      <select
        aria-label="Filtrar por estado"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className={SELECT_CLASSES}
      >
        <option>{ALL_STATUSES}</option>
        <option>{STATUS_CONFIRMED}</option>
        <option>{STATUS_NEEDS_REVIEW}</option>
      </select>
      {/*
        Las opciones salen del catálogo (tabla `tags`), no de los movimientos
        cargados. Antes se sacaban de la primera página de 300, así que una
        etiqueta que solo estuviera más atrás no aparecía y había pescadilla:
        para cargarlo todo hacía falta filtrar, y para filtrar hacía falta ver
        la opción. Ahora una etiqueta existe aunque no la lleve nadie.

        Si todavía no has creado ninguna, el desplegable no aparece en vez de
        ofrecer una lista vacía.
      */}
      {tags.length > 0 && (
        <select aria-label="Filtrar por etiqueta" value={tag} onChange={(e) => setTag(e.target.value)} className={SELECT_CLASSES}>
          <option value={ALL_TAGS}>{ALL_TAGS}</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.emoji ? `${t.emoji} ` : ''}
              {t.name}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
