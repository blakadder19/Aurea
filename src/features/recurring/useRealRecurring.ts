import { useEffect, useState } from 'react'
import type { RecurringCategory, RecurringItem } from '../../data/recurring'
import { formatIsoDayMonth } from '../../lib/format'
import {
  detectDuplicates,
  detectRecurringGroups,
  priceIncreaseCents,
  type DetectedGroup,
  type RawCharge,
} from '../../lib/recurringCalc'
import { supabase } from '../../lib/supabase/client'
import { useAuthStore } from '../../lib/supabase/useAuth'

/** category_group real → bloque de Pagos y suscripciones. Sin grupo asignado → 'otros'. */
const GROUP_TO_BUCKET: Partial<Record<string, RecurringCategory>> = {
  vivienda: 'esenciales',
  salud: 'esenciales',
  suscripciones: 'suscripciones',
}

function titleCase(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\b\p{L}/gu, (c) => c.toUpperCase())
}

function shorten(name: string, max = 14): string {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name
}

export interface RealRecurringResult {
  loading: boolean
  /** null mientras carga o si no hay sesión — no confundir con "cero recurrentes". */
  items: RecurringItem[] | null
  groups: DetectedGroup[]
  refetch: () => void
}

/**
 * Cargos recurrentes reales: se detectan en el cliente a partir del
 * historial de `transactions` (sin tabla propia — ver migración
 * 20260824070000). Solo se admite cadencia mensual; ver recurringCalc.ts.
 */
export function useRealRecurring(): RealRecurringResult {
  const session = useAuthStore((s) => s.session)
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<RecurringItem[] | null>(null)
  const [groups, setGroups] = useState<DetectedGroup[]>([])
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!supabase || !session) {
      setItems(null)
      setGroups([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    async function load() {
      if (!supabase) return

      const [{ data: txRows, error: txError }, { data: accountRows }, { data: categoryRows }, { data: dismissalRows }, { data: manualRows }] =
        await Promise.all([
          // Tope generoso, no un recorte real: a más de 10.000 gastos (~6 años al ritmo actual)
          // habría que paginar de verdad, igual que ya hace Movimientos.
          supabase
            .from('transactions')
            .select('account_id, description, amount_cents, booking_date, value_date, category_id')
            .eq('credit_debit', 'DBIT')
            .order('booking_date', { ascending: true })
            .limit(10000),
          supabase.from('accounts').select('id, name, display_name, connection_id'),
          supabase.from('categories').select('id, category_group'),
          supabase.from('recurring_dismissals').select('id, dedupe_key, scope').eq('active', true),
          supabase.from('manual_recurring_items').select('id, name, amount_cents, frequency, next_charge_date').eq('active', true),
        ])
      if (cancelled) return
      if (txError || !txRows) {
        console.error('useRealRecurring: fallo al leer transactions', txError)
        setItems([])
        setGroups([])
        setLoading(false)
        return
      }

      const connectionIds = [...new Set((accountRows ?? []).map((a) => a.connection_id).filter(Boolean))]
      const { data: connectionRows } =
        connectionIds.length > 0
          ? await supabase.from('bank_connections').select('id, aspsp_name').in('id', connectionIds)
          : { data: [] }
      if (cancelled) return

      const institutionByConnection = new Map((connectionRows ?? []).map((c) => [c.id, c.aspsp_name as string]))
      const accountNameById = new Map(
        (accountRows ?? []).map((a) => {
          const name = (a.display_name as string | null) || (a.name as string)
          const institution = a.connection_id ? institutionByConnection.get(a.connection_id) : undefined
          return [a.id as string, institution ? `${name} · ${institution}` : name]
        }),
      )
      const groupByCategory = new Map((categoryRows ?? []).map((c) => [c.id as string, c.category_group as string]))
      const categoryByTxKey = new Map<string, string | null>()

      const charges: RawCharge[] = []
      for (const tx of txRows) {
        const dateISO = (tx.booking_date as string | null) ?? (tx.value_date as string | null)
        const merchant = (tx.description as string | null)?.trim()
        if (!dateISO || !merchant) continue
        charges.push({
          accountId: tx.account_id as string,
          merchant,
          dateISO,
          amountCents: tx.amount_cents as number,
        })
        // Última categoría vista para cada cuenta+comercio: se usa la del cargo más reciente.
        categoryByTxKey.set(`${tx.account_id}::${merchant.toLowerCase().trim()}`, tx.category_id as string | null)
      }

      const detected = detectRecurringGroups(charges)
      const duplicates = detectDuplicates(detected)
      const duplicateByKey = new Map<string, { otherAccount: string; dayDiff: number }>()
      for (const d of duplicates) {
        duplicateByKey.set(d.a.dedupeKey, { otherAccount: accountNameById.get(d.b.accountId) ?? d.b.accountId, dayDiff: d.dayDiff })
        duplicateByKey.set(d.b.dedupeKey, { otherAccount: accountNameById.get(d.a.accountId) ?? d.a.accountId, dayDiff: d.dayDiff })
      }

      const highlightDismissed = new Set(
        (dismissalRows ?? []).filter((d) => d.scope === 'highlight').map((d) => d.dedupe_key as string),
      )
      const itemDismissed = new Set((dismissalRows ?? []).filter((d) => d.scope === 'item').map((d) => d.dedupe_key as string))

      const mapped: RecurringItem[] = detected
        .filter((g) => !itemDismissed.has(g.dedupeKey))
        .map((g) => {
          const name = titleCase(g.merchant)
          const categoryId = categoryByTxKey.get(`${g.accountId}::${g.merchant.toLowerCase().trim()}`)
          const categoryGroup = categoryId ? groupByCategory.get(categoryId) : undefined
          const bucket = categoryGroup ? (GROUP_TO_BUCKET[categoryGroup] ?? 'otros') : 'otros'
          const history = g.occurrences
            .slice(0, -1)
            .reverse()
            .map((o) => ({ date: formatIsoDayMonth(o.dateISO), amount: Math.abs(o.amountCents) / 100 }))

          let highlight: RecurringItem['highlight']
          if (!highlightDismissed.has(g.dedupeKey)) {
            const increase = priceIncreaseCents(g)
            const dup = duplicateByKey.get(g.dedupeKey)
            if (increase !== null) {
              const prevEuros = ((g.prevAmountCents ?? 0) / 100).toFixed(2).replace('.', ',')
              const lastEuros = (g.lastAmountCents / 100).toFixed(2).replace('.', ',')
              highlight = {
                variant: 'warning',
                icon: '▲',
                badge: 'Sube de precio',
                explanation: `${name} pasa de ${prevEuros} € a ${lastEuros} € el ${formatIsoDayMonth(g.nextChargeDateISO)}. ${(increase / 100).toFixed(2).replace('.', ',')} € más al mes.`,
                actions: [{ label: 'Aceptar el cambio', kind: 'resolve' }],
                resolvedMessage: `Subida de precio de ${name} aceptada.`,
              }
            } else if (dup) {
              const amountEuros = (g.lastAmountCents / 100).toFixed(2).replace('.', ',')
              highlight = {
                variant: 'info',
                icon: '!',
                badge: 'Posible duplicado',
                explanation: `Dos cargos de ${amountEuros} € en cuentas distintas (${accountNameById.get(g.accountId) ?? ''} y ${dup.otherAccount}), con ${dup.dayDiff} día(s) de diferencia.`,
                actions: [{ label: 'No es duplicado', kind: 'resolve' }],
                resolvedMessage: `${name} marcado como no duplicado.`,
              }
            }
          }

          return {
            id: g.dedupeKey,
            name,
            shortName: shorten(name),
            account: accountNameById.get(g.accountId) ?? 'Cuenta',
            nextChargeLabel: formatIsoDayMonth(g.nextChargeDateISO),
            nextChargeDay: null, // se recalcula por mes en RecurringCalendar a partir de `groups`.
            frequency: 'Mensual',
            amount: g.lastAmountCents / 100,
            category: bucket,
            highlight,
            history,
          }
        })
        .sort((a, b) => a.name.localeCompare(b.name))

      const manualItems: RecurringItem[] = (manualRows ?? []).map((r) => {
        const nextDate = r.next_charge_date as string | null
        return {
          id: r.id as string,
          name: r.name as string,
          shortName: shorten(r.name as string),
          account: 'Manual',
          nextChargeLabel: nextDate ? formatIsoDayMonth(nextDate) : 'Sin fecha definida',
          nextChargeDay: null,
          frequency: (r.frequency as string | null) ?? 'Mensual',
          amount: (r.amount_cents as number) / 100,
          category: 'otros',
          history: [],
          isManual: true,
        }
      })

      setGroups(detected.filter((g) => !itemDismissed.has(g.dedupeKey)))
      setItems([...mapped, ...manualItems].sort((a, b) => a.name.localeCompare(b.name)))
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [session, version])

  return { loading, items, groups, refetch: () => setVersion((v) => v + 1) }
}

interface DismissResult {
  dismissalId: string | null
  error: string | null
}

async function dismiss(dedupeKey: string, scope: 'highlight' | 'item'): Promise<DismissResult> {
  if (!supabase) return { dismissalId: null, error: 'Supabase no está configurado.' }
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { dismissalId: null, error: 'Inicia sesión de nuevo.' }

  const { data, error } = await supabase
    .from('recurring_dismissals')
    .upsert(
      { user_id: user.id, dedupe_key: dedupeKey, scope, active: true },
      { onConflict: 'user_id,dedupe_key,scope' },
    )
    .select('id')
    .single()
  if (error || !data) {
    console.error('dismiss: fallo al guardar', error)
    return { dismissalId: null, error: 'No hemos podido guardar el cambio.' }
  }
  return { dismissalId: data.id as string, error: null }
}

export function dismissHighlight(dedupeKey: string): Promise<DismissResult> {
  return dismiss(dedupeKey, 'highlight')
}

export function dismissItem(dedupeKey: string): Promise<DismissResult> {
  return dismiss(dedupeKey, 'item')
}

/** Deshace un descarte (vuelve a mostrar el aviso o el elemento). */
export async function undoDismiss(dismissalId: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('recurring_dismissals').update({ active: false }).eq('id', dismissalId)
  if (error) console.error('undoDismiss: fallo al deshacer', error)
}

/**
 * Da de alta un recurrente a mano — para cargos que Áurea no puede ver
 * (pago en efectivo, otra entidad) o que todavía no han cobrado ninguna
 * vez. Solo cadencia mensual, igual que la detección automática.
 */
export async function createManualRecurringItem(name: string, amountCents: number, nextChargeDateIso: string | null): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'
  if (!name.trim()) return 'Ponle un nombre al recurrente.'
  if (!Number.isInteger(amountCents) || amountCents <= 0) return 'El importe debe ser mayor que 0.'

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 'Inicia sesión de nuevo.'

  const { error } = await supabase.from('manual_recurring_items').insert({
    user_id: user.id,
    name: name.trim(),
    amount_cents: amountCents,
    frequency: 'Mensual',
    next_charge_date: nextChargeDateIso,
  })
  if (error) {
    console.error('createManualRecurringItem: fallo al crear', error)
    return 'No hemos podido crear el recurrente. Inténtalo de nuevo.'
  }
  return null
}

/** Desactiva un recurrente manual (pausar/cancelar). Reversible: ver reactivateManualRecurringItem. */
export async function deactivateManualRecurringItem(id: string): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'
  const { error } = await supabase.from('manual_recurring_items').update({ active: false }).eq('id', id)
  if (error) {
    console.error('deactivateManualRecurringItem: fallo al desactivar', error)
    return 'No hemos podido borrar el recurrente. Inténtalo de nuevo.'
  }
  return null
}

/** Deshace una desactivación. */
export async function reactivateManualRecurringItem(id: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('manual_recurring_items').update({ active: true }).eq('id', id)
  if (error) console.error('reactivateManualRecurringItem: fallo al deshacer', error)
}
