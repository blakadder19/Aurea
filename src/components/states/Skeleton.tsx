interface SkeletonProps {
  className?: string
  /** Accesible: qué bloque real está cargando ("Cargando tu Disponible hoy…"). */
  label?: string
}

/** Bloque con shimmer que respeta alto y ancho del contenido real que sustituye. */
export function Skeleton({ className = 'h-4 w-full', label }: SkeletonProps) {
  return <div className={`skeleton ${className}`} role={label ? 'status' : undefined} aria-label={label} />
}
