export type BadgeVariant = 'success' | 'warning' | 'danger' | 'pending' | 'info' | 'plum' | 'neutral'

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  success: 'bg-green-soft border-green-soft-line text-green-text',
  warning: 'bg-warning-bg border-warning-line text-warning-text',
  danger: 'bg-danger-bg border-danger-line text-danger-text',
  pending: 'bg-canvas border-line border-dashed text-ink-muted',
  info: 'bg-info-bg border-info-line text-info',
  plum: 'bg-plum-bg border-plum-line text-plum',
  neutral: 'bg-canvas border-line text-ink-muted',
}

const VARIANT_ICON: Partial<Record<BadgeVariant, string>> = {
  success: '✓',
  warning: '▲',
  danger: '!',
  pending: '◌',
}

interface BadgeProps {
  variant: BadgeVariant
  children: string
  icon?: string
  size?: 'sm' | 'md'
}

/**
 * Estado = color + icono + palabra, nunca solo color. Las variantes de
 * estado/atención (success/warning/danger/pending) siempre llevan icono.
 * Las variantes puramente categóricas (info/plum/neutral, p.ej. función de
 * cuenta) no lo necesitan: no comunican un aviso, solo clasifican.
 */
export function Badge({ variant, children, icon, size = 'md' }: BadgeProps) {
  const sizeClasses = size === 'sm' ? 'text-[13px] py-1 px-2.5' : 'text-[14px] py-[7px] px-3'
  const resolvedIcon = icon ?? VARIANT_ICON[variant]
  return (
    <span
      className={`inline-flex items-center gap-2 self-start rounded-full border font-semibold ${sizeClasses} ${VARIANT_STYLES[variant]}`}
    >
      {resolvedIcon && <span aria-hidden="true">{resolvedIcon}</span>}
      {children}
    </span>
  )
}
