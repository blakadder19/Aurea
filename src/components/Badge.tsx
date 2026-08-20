export type BadgeVariant = 'success' | 'warning' | 'danger' | 'pending'

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  success: 'bg-green-soft border-green-soft-line text-green-text',
  warning: 'bg-warning-bg border-warning-line text-warning-text',
  danger: 'bg-danger-bg border-danger-line text-danger-text',
  pending: 'bg-canvas border-line border-dashed text-ink-muted',
}

const VARIANT_ICON: Record<BadgeVariant, string> = {
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

/** Estado = color + icono + palabra. Nunca solo color. */
export function Badge({ variant, children, icon, size = 'md' }: BadgeProps) {
  const sizeClasses = size === 'sm' ? 'text-[13px] py-1 px-2.5' : 'text-[14px] py-[7px] px-3'
  return (
    <span
      className={`inline-flex items-center gap-2 self-start rounded-full border font-semibold ${sizeClasses} ${VARIANT_STYLES[variant]}`}
    >
      <span aria-hidden="true">{icon ?? VARIANT_ICON[variant]}</span>
      {children}
    </span>
  )
}
