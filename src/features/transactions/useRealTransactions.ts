import { useCallback, useEffect, useState } from 'react'
import type { Transaction } from '../../data/transactions'
import type { IncomeType } from '../../lib/declaredIncome'
import { formatIsoDayMonth } from '../../lib/format'
import { supabase } from '../../lib/supabase/client'
import { useAuthStore } from '../../lib/supabase/useAuth'
import { useTransactionsRefreshBus } from './refreshBus'
import { buildAccountLabels } from './accountLabels'
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
  /** Solo tiene sentido en un movimiento positivo — de qué tipo de ingreso se trata (salario, extra...). */
  incomeType: IncomeType | null
  /** Te devuelven parte de un gasto compartido: resta del gasto de su categoría, no suma como ingreso. */
  isReimbursement: boolean
  /** Saldo inicial o revalorización de un activo manual: mueve el patrimonio, pero no es ingreso ni gasto. */
  isBalanceAdjustment: boolean
  /** Divisa del movimiento, que no siempre es la de la cuenta (un pocket PLN cuelga de la misma cuenta). */
  currency: string
  /** Lo que el banco dice que es: EXCHANGE, TRANSFER, CARD_PAYMENT… null en lo anterior al 20 jun 2026, que ya no se puede repedir. */
  transactionCode: string | null
  /** Tasa exacta del cambio, tal cual llega. Solo en movimientos con cambio de divisa. */
  exchangeRate: string | null
  /** Importe instruido en céntimos: el de antes del margen de Revolut. */
  instructedAmountCents: number | null
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
  /**
   * Carga de golpe todo el histórico. Lo usa Movimientos al filtrar o
   * buscar: si no, el buscador solo mira la primera página y jura que no
   * existe algo que sí tienes, solo que más atrás.
   */
  loadAll: () => void
}

const PAGE_SIZE = 300

/**
 * Tope de seguridad para "cargarlo todo". Muy por encima de lo que tiene
 * nadie con unos años de histórico, pero evita pedir sin límite.
 */
const MAX_TRANSACTIONS = 10000

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
            'id, account_id, booking_date, value_date, description, amount_cents, currency, transaction_code, exchange_rate, instructed_amount_cents, category_id, needs_review, user_note, tags, display_name, is_internal_transfer, receipt_path, income_type, is_reimbursement, is_balance_adjustment',
          )
          .order('booking_date', { ascending: false })
          .limit(loadedCount),
        supabase.from('accounts').select('id, name, display_name, product, connection_id, currency'),
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
      const accountLabelById = buildAccountLabels(
        (accountRows ?? []).map((a) => ({
          id: a.id as string,
          name: (a.display_name as string | null) || (a.name as string | null) || (a.product as string | null) || 'Cuenta',
          institution: institutionByConnection.get(a.connection_id as string) ?? 'Banco conectado',
          currency: a.currency as string | null,
        })),
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
          incomeType: (row.income_type as IncomeType | null) ?? null,
          isReimbursement: Boolean(row.is_reimbursement),
          isBalanceAdjustment: Boolean(row.is_balance_adjustment),
          currency: (row.currency as string | null) ?? 'EUR',
          transactionCode: (row.transaction_code as string | null) ?? null,
          exchangeRate: (row.exchange_rate as string | null) ?? null,
          instructedAmountCents: (row.instructed_amount_cents as number | null) ?? null,
        }
      })

      setTransactions(mapped)
      setLoading(false)

      // TEMPORAL — diagnóstico de "los chips no aparecen sin recargar".
      // Apunta CADA recarga que termina: si después de etiquetar no aparece
      // ninguna línea, el refetch no está llegando; si aparece y ya trae las
      // etiquetas, el fallo es de pintado y no de datos.
      void recordTagCallDebug({
        origen: 'useRealTransactions.load',
        tag: '',
        ids: [],
        nota: `filas=${mapped.length} conEtiqueta=${mapped.filter((t) => t.tags.length > 0).length} version=${version} loadedCount=${loadedCount}`,
      })
    }

    load()
    return () => {
      cancelled = true
    }
  }, [session, categories, version, loadedCount])

  // Identidad estable: son dependencias de efectos en Movimientos, y si
  // cambiaran en cada render los harían dispararse sin parar.
  const loadMore = useCallback(() => setLoadedCount((n) => n + PAGE_SIZE), [])
  const loadAll = useCallback(() => setLoadedCount(MAX_TRANSACTIONS), [])

  const hasMore = transactions !== null && transactions.length === loadedCount
  return { loading, transactions, refetch: bump, hasMore, loadMore, loadAll }
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
 * Añade una etiqueta a varios movimientos a la vez, sin pisar las que ya
 * tuviera cada uno ni duplicarla.
 *
 * Una sola sentencia, vía RPC. Hasta el 18 sep 2026 esto leía los movimientos
 * y mandaba un UPDATE POR MOVIMIENTO en paralelo: N escrituras independientes
 * que podían quedarse a medias sin que nadie se enterara, porque el único
 * control era "¿alguna devolvió error?". Nadie contaba filas.
 *
 * Ahora es atómico y devuelve cuántos llevan la etiqueta al terminar, para
 * poder contrastarlo con cuántos se seleccionaron. Ver la migración
 * `20260918120000_add_tag_to_transactions_fn.sql`.
 */
/**
 * TEMPORAL — instrumentación del fallo "etiquetar en lote solo etiqueta uno".
 *
 * Ni los tests con mocks ni las llamadas a mano contra la API de producción
 * reproducen la pérdida, así que hay que mirar la llamada de verdad. Apunta en
 * `debug_tag_calls` cuántos ids hay en cada salto. Nunca rompe el flujo: si
 * falla el apunte, se traga el error y se sigue etiquetando.
 *
 * BORRAR junto con la tabla en cuanto se sepa dónde se pierden.
 */
export async function recordTagCallDebug(entry: {
  origen: string
  tag: string
  ids: string[]
  storeCount?: number
  closureCount?: number
  nota?: string
}): Promise<void> {
  console.info('[aurea][debug] etiquetar en lote', entry)
  if (!supabase) return
  try {
    await supabase.from('debug_tag_calls').insert({
      origen: entry.origen,
      tag: entry.tag,
      ids: entry.ids,
      store_count: entry.storeCount ?? null,
      closure_count: entry.closureCount ?? null,
      nota: entry.nota ?? null,
    })
  } catch (err) {
    console.warn('[aurea][debug] no se pudo apuntar la llamada', err)
  }
}

export async function bulkAddTag(ids: string[], tag: string): Promise<{ error: string | null; taggedCount: number }> {
  // TEMPORAL — lo que de verdad llega aquí, al final de la cadena.
  void recordTagCallDebug({ origen: 'bulkAddTag', tag, ids, nota: `recibidos ${ids.length}` })
  if (!supabase) return { error: 'Supabase no está configurado.', taggedCount: 0 }
  const trimmed = tag.trim()
  if (!trimmed) return { error: 'Escribe una etiqueta.', taggedCount: 0 }
  if (ids.length === 0) return { error: null, taggedCount: 0 }

  const { data, error } = await supabase.rpc('add_tag_to_transactions', { p_ids: ids, p_tag: trimmed })
  if (error) {
    console.error('bulkAddTag: fallo al guardar', error)
    return { error: 'No hemos podido guardar la etiqueta. Inténtalo de nuevo.', taggedCount: 0 }
  }

  const taggedCount = (data as number | null) ?? 0
  // Si la cuenta no cuadra con lo seleccionado, se dice. Antes esto era
  // invisible: el cliente solo miraba si alguna de las N escrituras fallaba.
  if (taggedCount < ids.length) {
    return {
      error: `Solo hemos podido etiquetar ${taggedCount} de ${ids.length} movimientos. Inténtalo de nuevo.`,
      taggedCount,
    }
  }
  return { error: null, taggedCount }
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

/**
 * Marca un abono como reembolso de un gasto compartido: deja de contar
 * como ingreso y pasa a restar del gasto de su categoría. Necesita que el
 * movimiento tenga categoría — la del gasto que te están devolviendo.
 */
export async function updateTransactionReimbursement(id: string, isReimbursement: boolean, categoryId?: string): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'
  const patch: Record<string, unknown> = { is_reimbursement: isReimbursement }
  if (isReimbursement && categoryId) patch.category_id = categoryId
  const { error } = await supabase.from('transactions').update(patch).eq('id', id)
  if (error) {
    console.error('updateTransactionReimbursement: fallo al guardar', error)
    return 'No hemos podido guardar el cambio. Inténtalo de nuevo.'
  }
  return null
}

/** Etiqueta un movimiento positivo como un tipo de ingreso (salario, extra...) — no cambia el total, solo el desglose. */
export async function updateTransactionIncomeType(id: string, incomeType: IncomeType | null): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'
  const { error } = await supabase.from('transactions').update({ income_type: incomeType }).eq('id', id)
  if (error) {
    console.error('updateTransactionIncomeType: fallo al guardar', error)
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
 * esta categoría") y la aplica retroactivamente, pero SOLO a lo que está sin
 * clasificar. También sigue viva después: `persistCollected` (sincronización
 * bancaria) la vuelve a aplicar a cada movimiento nuevo que llegue, así que
 * no hace falta recrearla cada vez que aparece un cargo del mismo comercio.
 *
 * Hasta el 18 sep 2026 el update era un `ilike` a secas, sin mirar la
 * categoría: crear una regla reclasificaba también movimientos que el usuario
 * ya había puesto a mano en otra categoría, en silencio y sin forma de
 * deshacerlo. Una regla sirve para rellenar huecos, no para pisar decisiones
 * ya tomadas; ante la duda, gana lo que el usuario ya decidió.
 *
 * "Sin clasificar" es el mismo criterio que usa el resto de la app
 * (`isTransactionPending`): un movimiento dividido ya está clasificado —en
 * varias categorías a la vez— aunque su `category_id` propio sea null, así que
 * tampoco se toca. Los que tienen categoría y están marcados para revisar
 * quedan fuera igualmente: tienen categoría, y esto no la pisa.
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

  const [{ data: candidates, error: readError }, { data: splitRows }] = await Promise.all([
    supabase.from('transactions').select('id').ilike('description', `%${value}%`).is('category_id', null),
    supabase.from('transaction_splits').select('transaction_id'),
  ])
  if (readError || !candidates) {
    console.error('createRuleFromTransaction: fallo al buscar a qué aplicarla', readError)
    return { error: 'La regla se creó, pero no hemos podido aplicarla a movimientos existentes.', appliedCount: 0 }
  }

  // Un movimiento dividido tiene `category_id` null y aun así está
  // clasificado, así que se queda fuera. No se puede filtrar en la propia
  // consulta (no hay NOT EXISTS en el cliente), y son cuatro filas.
  const splitIds = new Set((splitRows ?? []).map((s) => s.transaction_id as string))
  const ids = candidates.map((c) => c.id as string).filter((id) => !splitIds.has(id))
  if (ids.length === 0) return { error: null, appliedCount: 0 }

  const { data, error: applyError } = await supabase
    .from('transactions')
    .update({ category_id: categoryId, needs_review: false })
    .in('id', ids)
    .select('id')
  if (applyError) {
    console.error('createRuleFromTransaction: fallo al aplicar la regla', applyError)
    return { error: 'La regla se creó, pero no hemos podido aplicarla a movimientos existentes.', appliedCount: 0 }
  }

  return { error: null, appliedCount: (data ?? []).length }
}
