import { formatMoney, formatMoneySigned } from '../lib/format'

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

/** Cifra en formato europeo, tabular, con signo − explícito en negativos. */
export function Money({
  value,
  tone = 'ink',
  signed = false,
  className = '',
  serif = false,
  decimals = 2,
  currency = 'EUR',
}: MoneyProps) {
  const text = signed ? formatMoneySigned(value, decimals, currency) : formatMoney(value, decimals, currency)
  return (
    <span className={`tabular ${serif ? 'font-serif' : ''} ${TONE_CLASSES[tone]} ${className}`}>{text}</span>
  )
}
