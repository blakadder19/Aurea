import { useEffect, useState } from 'react'
import type { Account } from '../../data/accounts'
import type { Debt } from '../../data/debts'
import { supabase } from '../../lib/supabase/client'
import { useAuthStore } from '../../lib/supabase/useAuth'

export interface RealDebt {
  accountId: string
  name: string
  institution: string
  /** Positivo: magnitud de lo pendiente (la cuenta en sí tiene balance negativo). */
  balanceCents: number
  annualRateBps: number
  monthlyPaymentCents: number | null
  nextPaymentDate: string | null
  extraPaymentReminder: string | null
}

interface RealDebtsResult {
  loading: boolean
  /** null mientras carga o si no hay sesión — no confundir con "cero deudas". */
  debts: RealDebt[] | null
  refetch: () => void
}

/**
 * Deudas reales: las cuentas ya clasificadas como "Deuda" en Cuentas y
 * patrimonio (saldo real, sincronizado), cruzadas con el detalle opcional
 * que el usuario haya guardado a mano (tipo, cuota, próximo pago).
 */
export function useRealDebts(accounts: Account[] | null): RealDebtsResult {
  const session = useAuthStore((s) => s.session)
  const [loading, setLoading] = useState(true)
  const [debts, setDebts] = useState<RealDebt[] | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!supabase || !session || accounts === null) {
      if (!supabase || !session) {
        setDebts(null)
        setLoading(false)
      }
      return
    }

    let cancelled = false
    setLoading(true)

    async function load() {
      if (!supabase) return
      const debtAccounts = (accounts ?? []).filter((a) => a.fn === 'Deuda')
      if (debtAccounts.length === 0) {
        setDebts([])
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('debt_details')
        .select('account_id, annual_rate_bps, monthly_payment_cents, next_payment_date, extra_payment_reminder')
        .in(
          'account_id',
          debtAccounts.map((a) => a.id),
        )
      if (cancelled) return
      if (error) {
        console.error('useRealDebts: fallo al leer debt_details', error)
      }

      const detailsByAccount = new Map((data ?? []).map((d) => [d.account_id as string, d]))

      setDebts(
        debtAccounts.map((a) => {
          const detail = detailsByAccount.get(a.id)
          return {
            accountId: a.id,
            name: a.name,
            institution: a.institution,
            balanceCents: Math.round(Math.abs(a.balance) * 100),
            annualRateBps: (detail?.annual_rate_bps as number | undefined) ?? 0,
            monthlyPaymentCents: (detail?.monthly_payment_cents as number | null | undefined) ?? null,
            nextPaymentDate: (detail?.next_payment_date as string | null | undefined) ?? null,
            extraPaymentReminder: (detail?.extra_payment_reminder as string | null | undefined) ?? null,
          }
        }),
      )
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [session, accounts, version])

  return { loading, debts, refetch: () => setVersion((v) => v + 1) }
}

/** Guarda el detalle de una deuda (upsert). RLS asegura que solo puede tocar las suyas. */
export async function saveDebtDetails(
  accountId: string,
  annualRateBps: number,
  monthlyPaymentCents: number | null,
  nextPaymentDate: string | null,
): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'
  if (!Number.isInteger(annualRateBps) || annualRateBps < 0) return 'El tipo de interés no puede ser negativo.'
  if (monthlyPaymentCents !== null && (!Number.isInteger(monthlyPaymentCents) || monthlyPaymentCents < 0)) {
    return 'La cuota no puede ser negativa.'
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 'Inicia sesión de nuevo para guardar el detalle.'

  const { error } = await supabase.from('debt_details').upsert(
    {
      user_id: user.id,
      account_id: accountId,
      annual_rate_bps: annualRateBps,
      monthly_payment_cents: monthlyPaymentCents,
      next_payment_date: nextPaymentDate,
    },
    { onConflict: 'user_id,account_id' },
  )
  if (error) {
    console.error('saveDebtDetails: fallo al guardar', error)
    return 'No hemos podido guardar el detalle. Inténtalo de nuevo.'
  }
  return null
}

/**
 * Guarda la intención de un pago extraordinario como nota visible en la
 * deuda — Áurea no ejecuta pagos reales, así que en vez de fingir que
 * "programa" el pago, solo persiste el recordatorio. Upsert de columnas
 * parciales: no toca tipo/cuota/próximo pago si ya existía la fila.
 */
export async function saveExtraPaymentReminder(accountId: string, note: string): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado.'

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return 'Inicia sesión de nuevo para guardar el recordatorio.'

  const { error } = await supabase
    .from('debt_details')
    .upsert({ user_id: user.id, account_id: accountId, extra_payment_reminder: note }, { onConflict: 'user_id,account_id' })
  if (error) {
    console.error('saveExtraPaymentReminder: fallo al guardar', error)
    return 'No hemos podido guardar el recordatorio. Inténtalo de nuevo.'
  }
  return null
}

const eurosDecimal = (cents: number) => cents / 100

function formatNextPayment(iso: string | null): string {
  if (!iso) return 'Sin definir'
  const [, month, day] = iso.split('-').map(Number)
  const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${day} ${MONTHS[month - 1]}`
}

/** Convierte una deuda real a la misma forma (euros) que ya consume DebtsTable/ExtraPaymentPanel. */
export function toDebtTableRow(d: RealDebt): Debt {
  const balance = eurosDecimal(d.balanceCents)
  const annualRate = d.annualRateBps / 10000
  const monthlyPayment = d.monthlyPaymentCents !== null ? eurosDecimal(d.monthlyPaymentCents) : null
  return {
    id: d.accountId,
    name: d.name,
    institution: d.institution,
    balance,
    annualRate,
    monthlyPayment,
    paymentLabel:
      monthlyPayment !== null
        ? `${monthlyPayment.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €/mes`
        : 'Saldo completo',
    nextPaymentLabel: formatNextPayment(d.nextPaymentDate),
    reminder: d.extraPaymentReminder,
  }
}
