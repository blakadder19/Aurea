import { Link } from 'react-router-dom'

interface EmptyStateAction {
  label: string
  onClick?: () => void
  to?: string
}

interface EmptyStateProps {
  headline: string
  body: string
  action: EmptyStateAction
  error?: string | null
}

const ACTION_CLASSES =
  'inline-flex min-h-11 items-center justify-center rounded-md border border-green bg-green px-[18px] text-base font-semibold text-surface hover:bg-green-hover'

/** Estado vacío: icono + frase que explica qué falta + una única acción clara. */
export function EmptyState({ headline, body, action, error }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3.5 rounded-card border border-line bg-surface p-7 text-center">
      <div className="h-16 w-16 rounded-full border border-dashed border-[#c4ccc8] bg-canvas" aria-hidden="true" />
      <div className="text-[19px] font-bold text-ink">{headline}</div>
      <p className="max-w-[34ch] text-base text-ink-muted text-pretty">{body}</p>
      {action.to ? (
        <Link to={action.to} className={ACTION_CLASSES}>
          {action.label}
        </Link>
      ) : (
        <button type="button" onClick={action.onClick} className={ACTION_CLASSES}>
          {action.label}
        </button>
      )}
      {error && <p className="max-w-[34ch] text-sm text-danger-text">{error}</p>}
    </div>
  )
}
