import { useAuthStore } from '../../lib/supabase/useAuth'
import { ConnectionsList } from './ConnectionsList'
import { ImportCsvPanel } from './ImportCsvPanel'
import { RealConnectionsCard } from './RealConnectionsCard'
import { SettingsBasics } from './SettingsBasics'
import { useSettingsStore } from './store'

function Header({ isAuthenticated }: { isAuthenticated: boolean }) {
  const openImport = useSettingsStore((s) => s.openImport)

  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line bg-surface px-4 py-5 lg:px-8">
      <div>
        <h1 className="font-serif text-[32px] font-semibold tracking-[-0.01em] text-ink">Conexiones y ajustes</h1>
        <div className="mt-1 text-base text-ink-muted">
          {isAuthenticated
            ? 'Arriba, tu conexión bancaria real. La lista de "Conexiones bancarias" de aquí abajo es de demostración.'
            : 'Todo esto es una demostración: ninguna conexión es real'}
        </div>
      </div>
      <button
        type="button"
        onClick={openImport}
        className="min-h-11 rounded-md border border-brand bg-brand px-[18px] text-base font-semibold text-surface hover:bg-brand-hover"
      >
        Importar CSV
      </button>
    </header>
  )
}

/** Pantalla Conexiones y ajustes: conexiones bancarias de demostración, importación CSV y ajustes básicos. */
export function SettingsPage() {
  const importOpen = useSettingsStore((s) => s.importOpen)
  const session = useAuthStore((s) => s.session)
  const isAuthenticated = session !== null

  return (
    <>
      <Header isAuthenticated={isAuthenticated} />
      <main className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 lg:p-8">
        {isAuthenticated && <RealConnectionsCard />}
        <ConnectionsList />
        {importOpen && <ImportCsvPanel />}
        <SettingsBasics />
      </main>
    </>
  )
}
