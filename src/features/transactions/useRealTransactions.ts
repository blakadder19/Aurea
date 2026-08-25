import { useEffect, useState } from 'react'
import type { Transaction } from '../../data/transactions'
import { formatIsoDayMonth } from '../../lib/format'
import { supabase } from '../../lib/supabase/client'
import { useAuthStore } from '../../lib/supabase/useAuth'
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
}

interface RealTransactionsResult {
  loading: boolean
  /** null mientras carga o si no hay sesión — no confundir con "cero movimientos". */
  transactions: RealTransaction[] | null
  refetch: () => void
}

const TRANSACTIONS_LIMIT = 300

/**
 * Movimientos reales del usuario autenticado: transactions + accounts +
 * bank_connections + categories, con la misma forma que `Transaction` en
 * data/transactions.ts — así TransactionsTable/TransactionPanel no cambian.
 */
export function useRealTransactions(categories: RealCategory[] | null): RealTransactionsResult {
  const session = useAuthStore((s) => s.session)
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<RealTransaction[] | null>(null)
  const [version, setVersion] = useState(0)

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
      const [{ data: txRows, error: txError }, { data: accountRows }, { data: connectionRows }] = await Promise.all([
        supabase
          .from('transactions')
          .select(
            'id, account_id, booking_date, value_date, description, amount_cents, category_id, needs_review, user_note, tags, display_name, is_internal_transfer',
          )
          .order('booking_date', { ascending: false })
          .limit(TRANSACTIONS_LIMIT),
        supabase.from('accounts').select('id, name, product, connection_id'),
        supabase.from('bank_connections').select('id, aspsp_name'),
      ])
      if (cancelled) return
      if (txError || !txRows) {
        console.error('useRealTransactions: fallo al leer transactions', txError)
        setTransactions([])
        setLoading(false)
        return
      }

      const institutionByConnection = new Map((connectionRows ?? []).map((c) => [c.id, c.aspsp_name as string]))
      const accountLabelById = new Map(
        (accountRows ?? []).map((a) => {
          const name = (a.name as string | null) || (a.product as string | null) || 'Cuenta'
          const institution = institutionByConnection.get(a.connection_id as string) ?? 'Banco conectado'
          return [a.id as string, `${name} · ${institution}`]
        }),
      )
      const categoryNameById = new Map((categories ?? []).map((c) => [c.id, categoryLabel(c)]))

      const mapped: RealTransaction[] = txRows.map((row) => {
        const isoDate = (row.booking_date as string | null) ?? (row.value_date as string | null)
        const categoryId = row.category_id as string | null
        return {
          id: row.id as string,
          fecha: isoDate ? formatIsoDayMonth(isoDate) : '',
          comercio: (row.description as string | null) || 'Movimiento',
          cuenta: accountLabelById.get(row.account_id as string) ?? 'Cuenta',
          categoria: categoryId ? (categoryNameById.get(categoryId) ?? 'Sin clasificar') : 'Sin clasificar',
          importe: (row.amount_cents as number) / 100,
          categoryId,
          accountId: row.account_id as string,
          needsReview: Boolean(row.needs_review),
          userNote: (row.user_note as string | null) ?? '',
          tags: (row.tags as string[] | null) ?? [],
          displayName: row.display_name as string | null,
          dateISO: isoDate,
          isInternalTransfer: Boolean(row.is_internal_transfer),
        }
      })

      setTransactions(mapped)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [session, categories, version])

  return { loading, transactions, refetch: () => setVersion((v) => v + 1) }
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
 * coinciden — igual que `applyRuleToExisting` en Aurea Finanzas: aplicación
 * puntual al crearla, no un motor de reglas continuo.
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
