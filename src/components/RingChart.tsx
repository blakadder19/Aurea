import type { ReactNode } from 'react'

export interface RingSegment {
  value: number
  /** Clase Tailwind de stroke, p.ej. "stroke-brand" o "stroke-cat-1". */
  strokeClassName: string
}

interface RingChartProps {
  segments: RingSegment[]
  /** Denominador del anillo completo. Si la suma de segmentos es menor, el resto queda como pista. */
  max: number
  size?: number
  strokeWidth?: number
  children?: ReactNode
  ariaLabel?: string
}

/**
 * Anillo de progreso o donut multi-segmento, según cuántos `segments` se pasen.
 * El resto del anillo (max - suma de segmentos) queda como pista sin colorear.
 * Compartido entre Disponible hoy (un segmento) y Presupuesto (uno por categoría).
 */
export function RingChart({ segments, max, size = 120, strokeWidth = 14, children, ariaLabel }: RingChartProps) {
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const safeMax = Math.max(max, segments.reduce((sum, s) => sum + s.value, 0), 1)

  let offset = 0
  const arcs = segments.map((seg) => {
    const clamped = Math.max(0, seg.value)
    const length = (clamped / safeMax) * circumference
    const arc = { ...seg, length, offset }
    offset += length
    return arc
  })

  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={ariaLabel}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={strokeWidth} className="stroke-line" />
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${arc.length} ${circumference - arc.length}`}
            strokeDashoffset={-arc.offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            className={arc.strokeClassName}
          />
        ))}
      </svg>
      {children && <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>}
    </div>
  )
}
