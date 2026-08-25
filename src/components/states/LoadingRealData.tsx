import { Card } from '../Card'
import { Skeleton } from './Skeleton'

/**
 * Estado de carga para una sesión real cuyos datos aún no han llegado.
 * Nunca se debe caer al contenido de demostración mientras esto es
 * verdad — aunque sea un instante, se verían cifras que no son las tuyas.
 */
export function LoadingRealData() {
  return (
    <Card className="flex flex-col gap-3" padding="lg">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-8 w-64" label="Cargando tus datos reales…" />
      <Skeleton className="h-4 w-3/5" />
    </Card>
  )
}
