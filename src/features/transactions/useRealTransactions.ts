import { useEffect, useState } from 'react'
import type { Transaction } from '../../data/transactions'
import { formatIsoDayMonth } from '../../lib/format'
import { supabase } from '../../lib/supabase/client'
import { useAuthStore } from '../../lib/supabase/useAuth'
import { useTransactionsRefreshBus } from './refreshBus'
import { categoryLabel, type RealCategory } from './useRealCategories'

/** Forma compatible con `Transaction` (TransactionsTable/TransactionPanel no cambian) + los datos que necesita edición/revisión real. */
export interface RealTransaction extends Transaction {
  categoryId: string | null
  accountId: string
  needsReview: boolean
  userNote: string
  tags: string[]
  /** Fecha ISO sin formatear (booking_date o value_date) — para cálculos, `fecha` es solo para mostrar. */
  dateISO: string | null
  /** Dinero moviéndose entre tus propias cuentas: no es un gasto ni un ingreso real, se excluye de esos cálculos. */
  isInternalTransfer: boolean
  /** Ruta en el bucket privado `receipts`, o null si no tiene foto adjunta. */
  receiptPath: string | null
  /** Dividido en varias categorías (transaction_splits) — su categoryId propio ya no representa el gasto real, ver el desglose. */
  hasSplits: boolean
}

/**
 * Un movimiento dividido ya está clasificado (en varias categorías a la
 * vez) aunque su categoryId propio sea null — nunca cuenta como pendiente.
 * Una transferencia entre tus propias cuentas tampoco: no es gasto ni
 * ingreso real, así que pedirle una categoría de gasto no tiene sentido.
 * Mismo criterio en Centro de revisión, el contador del menú, el filtro
 * "Estado" de Movimientos y las sugerencias de IA, para no repetir
 * `!categoryId || needsReview` en cada sitio con el riesgo de que alguno
 * se quede desactualizado.
 */
export function isTransactionPending(t: {
  categoryId: string | null
  needsReview: boolean
  hasSplits: boolean
  isInternalTransfer: boolean
}): boolean {
  return !t.hasSplits && !t.isInternalTransfer && (!t.categoryId || t.needsReview)
}

interface RealTransactionsResult {
  loading: boolean
  /** null mientras carga o si no hay sesión — no confundir con "cero movimientos". */
  transactions: RealTransaction[] | null
  refetch: () => void
  /** true si puede que haya movimientos más antiguos sin cargar todavía — ver loadMore. */
  hasMore: boolean
  /** Carga otra página de movimientos más antiguos (además de los ya cargados, no en su lugar). */
  loadMore: () => void
}

const PAGE_SIZE = 300

/**
 * Movimientos reales del usuario autenticado: transactions + accounts +
 * bank_connections + categories, con la misma forma que `Transaction` en
 * data/transactions.ts — así TransactionsTable/TransactionPanel no cambian.
 */
export function useRealTransactions(categories: RealCategory[] | null): RealTransactionsResult {
  const session = useAuthStore((s) => s.session)
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<RealTransaction[] | null>(null)
  const [loadedCount, setLoadedCount] = useState(PAGE_SIZE)
  const version = useTransactionsRefreshBus((s) => s.version)
  const bump = useTransactionsRefreshBus((s) => s.bump)

  useEffect(() => {
    if (!supabase || !session || categories === null) {
      if (!supabase || !session) {
        setTransactions(null)
        setLoading(false)
      }
      return
    }

    let cancelled = false
    setLoading(true)

    async function load() {
      if (!supabase) return
      const [{ data: txRows, error: txError }, { data: accountRows }, { data: connectionRows }, { data: splitRows }] = await Promise.all([
        supabase
          .from('transactions')
          .select(
            'id, account_id, booking_date, value_date, description, amount_cents, category_id, needs_review, user_note, tags, display_name, is_internal_transfer, receipt_path',
          )
          .order('booking_date', { ascending: false })
          .limit(loadedCount),
        supabase.from('accounts').select('id, name, display_name, product, connection_id'),
        supabase.from('bank_connections').select('id, aspsp_name'),
        supabase.from('transaction_splits').select('transaction_id'),
      ])
      if (cancelled) return
      if (txError || !txRows) {
        console.error('useRealTransactions: fallo al leer transactions', txError)
        setTransactions([])
        setLoading(false)
        return
      }

      const splitTransactionIds = new Set((splitRows ?? []).map((s) => s.transaction_id as string))

      const institutionByConnection = new Map((connectionRows ?? []).map((c) => [c.id, c.aspsp_name as string]))
      const accountLabelById = new Map(
        (accountRows ?? []).map((a) => {
          const name = (a.display_name as string | null) || (a.name as string | null) || (a.product as string | null) || 'Cuenta'
          const institution = institutionByConnection.get(a.connection_id as string) ?? 'Banco conectado'
          return [a.id as string, `${name} · ${institution}`]
        }),
      )
      const categoryNameById = new Map((categories ?? []).map((c) => [c.id, categoryLabel(c)]))

      const mapped: RealTransaction[] = txRows.map((row) => {
        const isoDate = (row.booking_date as string | null) ?? (row.value_date as string | null)
        const categoryId = row.category_id as string | null
        const hasSplits = splitTransactionIds.has(row.id as string)
        return {
          id: row.id as string,
          fecha: isoDate ? formatIsoDayMonth(isoDate) : '',
          comercio: (row.description as string | null) || 'Movimiento',
          cuenta: accountLabelById.get(row.account_id as string) ?? 'Cuenta',
          categoria: hasSplits ? 'Varias categorías' : categoryId ? (categoryNameById.get(categoryId) ?? 'Sin clasificar') : 'Sin clasificar',
          importe: (row.amount_cents as number) / 100,
          categoryId,
          accountId: row.account_id as string,
          needsReview: Boolean(row.needs_review),
          userNote: (row.user_note as string | null) ?? '',
          tags: (row.tags as string[] | null) ?? [],
          displayName: row.display_name as string | null,
          dateISO: isoDate,
          isInternalTransfer: Boolean(row.is_internal_transfer),
          receiptPath: (row.receipt_path as string | null) ?? null,
          hasSplits,
        }
      })

      setTransactions(mapped)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [session, categories, version, loadedCount])

  const hasMore = transactions !== null && transactions.length === loadedCount
  return { loading, transactions, refetch: bump, hasMore, loadMore: () => setLoadedCount((n) => n + PAGE_SIZE) }
}

/** Escribe la categoría de un movimiento real. RLS asegura que solo puede tocar los suyos. */
export async function updateTransactionCategory(id: string, categoryId: string | null): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'
  const { error } = await supabase.from('transactions').update({ category_id: categoryId, needs_review: false }).eq('id', id)
  if (error) {
    console.error('updateTransactionCategory: fallo al guardar', error)
    return 'No hemos podido guardar el cambio. Inténtalo de nuevo.'
  }
  return null
}

/**
 * Aplica varias sugerencias de categoría (una distinta por movimiento) de
 * golpe, sin refetch por cada una — pensado para el bucle de "Clasificar
 * todos los pendientes con IA" del Centro de revisión, que puede llamar
 * esto decenas de veces seguidas; quien lo use decide cuándo refrescar.
 */
export async function bulkApplyCategorySuggestions(
  suggestions: { transactionId: string; categoryId: string }[],
): Promise<{ appliedCount: number; error: string | null }> {
  if (!supabase) return { appliedCount: 0, error: 'Supabase no está configurado.' }
  if (suggestions.length === 0) return { appliedCount: 0, error: null }

  const results = await Promise.all(
    suggestions.map(({ transactionId, categoryId }) =>
      supabase!.from('transactions').update({ category_id: categoryId, needs_review: false }).eq('id', transactionId),
    ),
  )
  const failedCount = results.filter((r) => r.error).length
  if (failedCount > 0) console.error('bulkApplyCategorySuggestions: fallo al guardar', failedCount, 'de', suggestions.length)

  return {
    appliedCount: suggestions.length - failedCount,
    error: failedCount === suggestions.length ? 'No hemos podido guardar las sugerencias. Inténtalo de nuevo.' : null,
  }
}

/** Cambia la categoría de varios movimientos a la vez. */
export async function bulkUpdateTransactionCategory(ids: string[], categoryId: string): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'
  const { error } = await supabase.from('transactions').update({ category_id: categoryId, needs_review: false }).in('id', ids)
  if (error) {
    console.error('bulkUpdateTransactionCategory: fallo al guardar', error)
    return 'No hemos podido guardar el cambio. Inténtalo de nuevo.'
  }
  return null
}

/**
 * Añade una etiqueta a varios movimientos a la vez, sin pisar las etiquetas
 * que ya tuviera cada uno ni duplicarla si ya la llevaba — lee las etiquetas
 * actuales de cada fila y las actualiza una a una (no hay `array_append` en
 * el cliente de Supabase para un `.update().in(...)` masivo).
 */
export async function bulkAddTag(ids: string[], tag: string): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'
  const trimmed = tag.trim()
  if (!trimmed) return 'Escribe una etiqueta.'

  const { data, error: readError } = await supabase.from('transactions').select('id, tags').in('id', ids)
  if (readError || !data) {
    console.error('bulkAddTag: fallo al leer', readError)
    return 'No hemos podido leer los movimientos seleccionados. Inténtalo de nuevo.'
  }

  const results = await Promise.all(
    data.map((row) => {
      const existing = (row.tags as string[] | null) ?? []
      const tags = existing.includes(trimmed) ? existing : [...existing, trimmed]
      return supabase!.from('transactions').update({ tags }).eq('id', row.id as string)
    }),
  )
  const failed = results.find((r) => r.error)
  if (failed) {
    console.error('bulkAddTag: fallo al guardar', failed.error)
    return 'No hemos podido guardar la etiqueta en todos los movimientos. Inténtalo de nuevo.'
  }
  return null
}

/** Escribe etiquetas y nota de un movimiento real. */
export async function updateTransactionNotesAndTags(id: string, note: string, tags: string[]): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'
  const { error } = await supabase
    .from('transactions')
    .update({ user_note: note || null, tags })
    .eq('id', id)
  if (error) {
    console.error('updateTransactionNotesAndTags: fallo al guardar', error)
    return 'No hemos podido guardar el cambio. Inténtalo de nuevo.'
  }
  return null
}

/** Marca o desmarca un movimiento como transferencia entre tus propias cuentas — se excluye de ingresos/gastos y de la detección de anomalías. */
export async function updateTransactionInternalTransfer(id: string, isInternalTransfer: boolean): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'
  const { error } = await supabase.from('transactions').update({ is_internal_transfer: isInternalTransfer }).eq('id', id)
  if (error) {
    console.error('updateTransactionInternalTransfer: fallo al guardar', error)
    return 'No hemos podido guardar el cambio. Inténtalo de nuevo.'
  }
  return null
}

/** Guarda un nombre personal para mostrar en vez de la descripción del banco — nunca cambia lo que el banco realmente dice. */
export async function updateTransactionDisplayName(id: string, displayName: string): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'
  const { error } = await supabase.from('transactions').update({ display_name: displayName.trim() || null }).eq('id', id)
  if (error) {
    console.error('updateTransactionDisplayName: fallo al guardar', error)
    return 'No hemos podido guardar el nombre. Inténtalo de nuevo.'
  }
  return null
}

/**
 * Crea una regla ("todo lo que contenga este texto en la descripción va a
 * esta categoría") y la aplica retroactivamente a los movimientos que ya
 * coinciden. También sigue viva después: `persistCollected` (sincronización
 * bancaria) la vuelve a aplicar a cada movimiento nuevo que llegue, así que
 * no hace falta recrearla cada vez que aparece un cargo del mismo comercio.
 */
export async function createRuleFromTransaction(
  matchValue: string,
  categoryId: string,
): Promise<{ error: string | null; appliedCount: number }> {
  if (!supabase) return { error: 'Supabase no está configurado.', appliedCount: 0 }
  const value = matchValue.trim()
  if (!value) return { error: 'No hay texto de comercio con el que crear la regla.', appliedCount: 0 }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Inicia sesión de nuevo para crear la regla.', appliedCount: 0 }

  const { error: insertError } = await supabase
    .from('rules')
    .insert({ user_id: user.id, match_field: 'description', match_value: value, category_id: categoryId })
  if (insertError) {
    console.error('createRuleFromTransaction: fallo al crear la regla', insertError)
    return { error: 'No hemos podido crear la regla. Inténtalo de nuevo.', appliedCount: 0 }
  }

  const { data, error: applyError } = await supabase
    .from('transactions')
    .update({ category_id: categoryId, needs_review: false })
    .ilike('description', `%${value}%`)
    .select('id')
  if (applyError) {
    console.error('createRuleFromTransaction: fallo al aplicar la regla', applyError)
    return { error: 'La regla se creó, pero no hemos podido aplicarla a movimientos existentes.', appliedCount: 0 }
  }

  return { error: null, appliedCount: (data ?? []).length }
}
