import { Link } from 'react-router-dom'

interface ErrorStateProps {
  headline: string
  body: string
  onRetry: () => void
  /** Ruta a Conexiones y ajustes; por defecto /ajustes. */
  connectionsTo?: string
}

/** Estado de error: icono !, explicación y dos salidas — Reintentar e Ir a Conexiones. */
export function ErrorState({ headline, body, onRetry, connectionsTo = '/ajustes' }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3.5 rounded-card border border-line bg-surface p-7 text-center">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full border border-danger-line bg-danger-bg text-[28px] font-bold text-danger-text"
        aria-hidden="true"
      >
        !
      </div>
      <div className="text-[19px] font-bold text-ink">{headline}</div>
      <p className="max-w-[34ch] text-base text-ink-muted text-pretty">{body}</p>
      <div className="flex flex-wrap justify-center gap-2.5">
        <button
          type="button"
          onClick={onRetry}
          className="min-h-11 rounded-md border border-green bg-green px-[18px] text-base font-semibold text-surface hover:bg-green-hover"
        >
          Reintentar
        </button>
        <Link
          to={connectionsTo}
          className="flex min-h-11 items-center rounded-md border border-line bg-surface px-[18px] text-base font-semibold text-ink hover:bg-canvas"
        >
          Ir a Conexiones
        </Link>
      </div>
    </div>
  )
}
