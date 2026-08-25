import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Skeleton } from '../../components/states/Skeleton'
import { EmptyState } from '../../components/states/EmptyState'
import { ErrorState } from '../../components/states/ErrorState'
import { StaleDataNotice } from '../../components/states/StaleDataNotice'
import { SyncingNotice } from '../../components/states/SyncingNotice'
import { NoSearchResults } from '../../components/states/NoSearchResults'
import { UndoBar } from '../../components/UndoBar'
import { Card } from '../../components/Card'
import { SectionLabel } from '../../components/SectionLabel'

function DemoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card padding="lg" className="flex flex-col gap-3.5">
      <SectionLabel>{title}</SectionLabel>
      {children}
    </Card>
  )
}

/** Catálogo de los siete estados de sistema compartidos, para revisarlos sin depender de que ocurran de verdad. */
export function StatesPage() {
  const [reconnected, setReconnected] = useState(false)
  const [undone, setUndone] = useState(false)
  const [retrying, setRetrying] = useState(false)

  return (
    <>
      <header className="border-b border-line bg-surface px-4 py-5 lg:px-8">
        <h1 className="font-serif text-[32px] font-semibold tracking-[-0.01em] text-ink">Áurea — estados</h1>
        <div className="mt-1 text-base text-ink-muted">
          Carga, vacío, error, desactualizado, sincronizando, sin resultados y confirmación con Deshacer.
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 lg:p-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <DemoCard title="Carga">
            <div className="flex flex-col gap-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-4 w-2/5" />
            </div>
            <div className="text-[15px] text-ink-muted">Cargando tu Disponible hoy…</div>
          </DemoCard>

          <DemoCard title="Vacío">
            <EmptyState
              headline="Todavía no hay objetivos"
              body="Crea el primero para ver aquí tu progreso real frente al previsto."
              action={{ label: 'Crear un objetivo', to: '/objetivos' }}
            />
          </DemoCard>

          <DemoCard title="Error">
            <ErrorState
              headline="No hemos podido cargar tus movimientos"
              body="Puede ser un problema temporal de conexión con tu banco."
              onRetry={() => {
                setRetrying(true)
                setTimeout(() => setRetrying(false), 900)
              }}
            />
            {retrying && <div className="text-center text-sm text-ink-muted">Reintentando…</div>}
          </DemoCard>

          <DemoCard title="Datos desactualizados">
            {reconnected ? (
              <div className="text-base font-semibold text-green-text">Reconectado.</div>
            ) : (
              <StaleDataNotice
                ageLabel="hace 3 días"
                body="MyInvestor no responde desde el 16 ago. Las cifras de Inversiones pueden no ser exactas."
                onReconnect={() => setReconnected(true)}
              />
            )}
          </DemoCard>

          <DemoCard title="Sincronización en curso">
            <SyncingNotice
              accountLabel="Revolut"
              body="Puede tardar hasta un minuto. Las demás cuentas ya están actualizadas."
            />
          </DemoCard>

          <DemoCard title="Sin resultados de búsqueda">
            <NoSearchResults query="Correos Express" onClearFilters={() => {}} />
          </DemoCard>
        </div>

        <DemoCard title="Confirmación con Deshacer">
          {undone ? (
            <div className="text-base text-ink-muted">Cambio deshecho.</div>
          ) : (
            <UndoBar message="3 movimientos marcados como «Transporte»." onUndo={() => setUndone(true)} />
          )}
        </DemoCard>

        <div className="text-[15px] text-ink-muted">
          Cada estado también está conectado a datos reales: el <Link to="/" className="text-brand">Disponible hoy de Inicio</Link> se carga con este skeleton,
          {' '}
          <Link to="/inversiones" className="text-brand">Inversiones</Link> muestra el aviso de datos desactualizados de MyInvestor, y{' '}
          <Link to="/cuentas" className="text-brand">Cuentas y patrimonio</Link> muestra la sincronización de Revolut — ambos a partir de las mismas conexiones
          de <Link to="/ajustes" className="text-brand">Conexiones y ajustes</Link>. La búsqueda sin resultados se ve en{' '}
          <Link to="/movimientos" className="text-brand">Movimientos</Link>.
        </div>
      </main>
    </>
  )
}
