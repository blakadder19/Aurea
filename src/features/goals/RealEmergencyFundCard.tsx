import { Badge } from '../../components/Badge'
import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { ProgressBar } from '../../components/ProgressBar'
import type { RealEmergencyFund } from './useRealEmergencyFund'

/** Fondo de emergencia real: cuentas de Ahorro frente al gasto medio mensual — sin previsión de fecha, no hay una aportación mensual real que proyectar. */
export function RealEmergencyFundCard({ fund }: { fund: RealEmergencyFund }) {
  const { savedEuros, monthlyEssentialSpend, targetMonths, targetEuros, monthsCovered } = fund
  const progressPct = targetEuros > 0 ? Math.min(100, (savedEuros / targetEuros) * 100) : 0
  const covered = monthsCovered >= targetMonths
  const monthsShort = Math.max(0, targetMonths - monthsCovered)

  if (monthlyEssentialSpend <= 0) {
    return (
      <Card className="flex flex-col gap-3" padding="lg">
        <h2 className="font-serif text-2xl font-semibold text-ink">Fondo de emergencia</h2>
        <p className="text-base text-ink-muted">Aún no hay suficiente historial de gasto para calcular cuántos meses cubren tus ahorros.</p>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col gap-4" padding="lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-ink">
            {covered ? `Tu fondo de emergencia cubre los ${targetMonths} meses` : `Te faltan ${monthsShort.toLocaleString('es-ES', { maximumFractionDigits: 1 })} meses de colchón`}
          </h2>
          <div className="mt-1 text-base text-ink-muted">
            <Money value={savedEuros} decimals={0} /> de <Money value={targetEuros} decimals={0} /> necesarios
          </div>
        </div>
        <Badge variant={covered ? 'success' : 'warning'} icon={covered ? '✓' : undefined}>
          {covered ? 'Cubierto' : 'Por debajo'}
        </Badge>
      </div>

      <ProgressBar percent={progressPct} heightPx={18} label={`${Math.round(progressPct)}% cubierto`} />

      <p className="text-base text-ink">
        <Money value={monthlyEssentialSpend} decimals={0} /> de gasto medio al mes (de tus movimientos reales) × {targetMonths} meses.
      </p>
    </Card>
  )
}
