import { currencySuffix, formatMoney, formatMoneySigned } from '../lib/format'
import { usePrivacyStore } from '../store/usePrivacyStore'

export type MoneyTone = 'ink' | 'green' | 'danger' | 'warning' | 'muted'

const TONE_CLASSES: Record<MoneyTone, string> = {
  ink: 'text-ink',
  green: 'text-green',
  danger: 'text-danger-text',
  warning: 'text-warning-text',
  muted: 'text-ink-muted',
}

interface MoneyProps {
  value: number
  tone?: MoneyTone
  signed?: boolean
  className?: string
  serif?: boolean
  /** Decimales a mostrar. 2 por defecto; usar 0 para cifras redondas (presupuesto, categorías). */
  decimals?: number
  /** Código ISO de la divisa del valor. EUR por defecto. */
  currency?: string
}

/** Cifra en formato europeo, tabular, con signo − explícito en negativos. Respeta el modo privacidad (antifaz de ancho fijo, nunca proporcional al valor real). */
export function Money({
  value,
  tone = 'ink',
  signed = false,
  className = '',
  serif = false,
  decimals = 2,
  currency = 'EUR',
}: MoneyProps) {
  const hidden = usePrivacyStore((s) => s.hidden)
  const text = hidden ? `•••• ${currencySuffix(currency)}` : signed ? formatMoneySigned(value, decimals, currency) : formatMoney(value, decimals, currency)
  return (
    <span aria-label={hidden ? 'Importe oculto' : undefined} className={`tabular ${serif ? 'font-serif' : ''} ${TONE_CLASSES[tone]} ${className}`}>
      {text}
    </span>
  )
}
