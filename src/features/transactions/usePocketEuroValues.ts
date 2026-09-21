import { useEffect, useState } from 'react'
import { convertPocketSpendFifo, type PocketMovement, type PocketSpendConversion } from '../../lib/pocketFifo'
import { supabase } from '../../lib/supabase/client'
import { useAuthStore } from '../../lib/supabase/useAuth'
import { useTransactionsRefreshBus } from './refreshBus'

const VACIO: PocketSpendConversion = { eurCentsById: new Map(), uncoveredCentsById: new Map() }

/**
 * El euro que costó cada gasto hecho desde un pocket en otra divisa.
 *
 * Trae los movimientos de pocket ENTEROS, sin filtro de fechas: FIFO necesita
 * los cambios anteriores al periodo que se esté mirando, que son los que
 * respaldan lo gastado dentro. Son unas pocas decenas de filas.
 */
export function usePocketEuroValues(): PocketSpendConversion {
  const session = useAuthStore((s) => s.session)
  const version = useTransactionsRefreshBus((s) => s.version)
  const [conversion, setConversion] = useState<PocketSpendConversion>(VACIO)

  useEffect(() => {
    if (!supabase || !session) {
      setConversion(VACIO)
      return
    }
    let cancelled = false

    async function load() {
      if (!supabase) return
      const { data, error } = await supabase
        .from('transactions')
        .select('id, account_id, currency, amount_cents, booking_date, value_date, exchange_rate, exchange_rate_unit_currency')
        .neq('currency', 'EUR')
      if (cancelled) return
      if (error || !data) {
        console.error('usePocketEuroValues: fallo al leer los movimientos de pocket', error)
        setConversion(VACIO)
        return
      }
      const movements: PocketMovement[] = data.map((p) => ({
        id: p.id as string,
        accountId: p.account_id as string,
        currency: p.currency as string,
        amountCents: p.amount_cents as number,
        dateISO: ((p.booking_date as string | null) ?? (p.value_date as string | null)) ?? '',
        exchangeRate: p.exchange_rate as string | null,
        exchangeRateUnitCurrency: p.exchange_rate_unit_currency as string | null,
      }))
      setConversion(convertPocketSpendFifo(movements))
    }

    load()
    return () => {
      cancelled = true
    }
  }, [session, version])

  return conversion
}
