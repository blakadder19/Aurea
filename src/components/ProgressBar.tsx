interface ProgressBarProps {
  /** Porcentaje relleno, 0–100. Se recorta al rango visible (nunca desborda la pista). */
  percent: number
  /** Color del relleno: token de fondo, p.ej. "bg-brand" o "bg-danger". */
  fillClassName?: string
  /** Marca vertical opcional (p.ej. ritmo esperado del presupuesto). */
  markerPercent?: number
  /** Alto de la pista en píxeles. */
  heightPx?: number
  label?: string
}

/**
 * Barra de progreso con pista neutra (funciona con cualquier color de
 * relleno) y marca vertical opcional de ritmo esperado. Compartida entre
 * Inicio y Presupuesto — no la dupliques.
 */
export function ProgressBar({
  percent,
  fillClassName = 'bg-brand',
  markerPercent,
  heightPx = 16,
  label,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent))
  return (
    <div
      className="relative rounded-full bg-canvas"
      style={{ height: heightPx }}
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={`absolute inset-y-0 left-0 rounded-full ${fillClassName}`}
        style={{ width: `${clamped}%` }}
      />
      {markerPercent !== undefined && (
        <div
          className="absolute -top-1.5 -bottom-1.5 w-[3px] rounded-sm bg-ink"
          style={{ left: `${Math.min(100, Math.max(0, markerPercent))}%` }}
        />
      )}
    </div>
  )
}
