import { Link, Outlet, useLocation } from 'react-router-dom'
import { currentUser } from '../data/demo'
import { useTransactionsStore } from '../features/transactions/store'

interface NavItem {
  label: string
  to?: string
  badge?: number
}

interface NavSection {
  title: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Tu dinero',
    items: [
      { label: 'Inicio', to: '/' },
      { label: 'Cuentas y patrimonio', to: '/cuentas' },
      { label: 'Movimientos', to: '/movimientos' },
    ],
  },
  {
    title: 'Planes',
    items: [
      { label: 'Presupuesto', to: '/presupuesto' },
      { label: 'Pagos y suscripciones', to: '/pagos' },
      { label: 'Objetivos' },
    ],
  },
  {
    title: 'Crecimiento',
    items: [{ label: 'Inversiones' }, { label: 'Deudas' }, { label: 'Planificación' }],
  },
  {
    title: 'Herramientas',
    items: [{ label: 'Asistente e insights' }, { label: 'Conexiones y ajustes' }],
  },
]

/** Barra lateral fija de 250 px. Inicio, Movimientos y Presupuesto navegan: el resto llega en cortes posteriores. */
function Sidebar() {
  const location = useLocation()
  const reviewCount = useTransactionsStore((s) => s.reviewItems.length)

  return (
    <nav className="hidden w-[250px] shrink-0 flex-col gap-6 border-r border-line bg-surface p-5 py-7 lg:flex">
      <div>
        <div className="font-serif text-[28px] font-bold text-ink">Áurea</div>
        <div className="mt-0.5 text-[13px] text-ink-muted">Tu dinero, con perspectiva</div>
      </div>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="flex flex-col gap-1">
            <div className="px-2.5 pb-1.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
              {section.title}
            </div>
            {section.items.map((item) => {
              const isActive = item.to !== undefined && location.pathname === item.to
              const rowClasses =
                'flex min-h-11 items-center justify-between rounded-md px-3 py-2.5 text-base'
              const badge = item.label === 'Movimientos' ? reviewCount : item.badge

              if (item.to) {
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className={`${rowClasses} ${
                      isActive ? 'bg-green-soft font-semibold text-green-text' : 'text-ink hover:bg-canvas'
                    }`}
                  >
                    {item.label}
                    {!!badge && (
                      <span className="rounded-full border border-danger-line bg-danger-bg px-2 py-0.5 text-[13px] font-bold text-danger-text">
                        {badge}
                      </span>
                    )}
                  </Link>
                )
              }

              return (
                <div key={item.label} className={`${rowClasses} text-ink-muted`}>
                  {item.label}
                  {!!badge && (
                    <span className="rounded-full border border-danger-line bg-danger-bg px-2 py-0.5 text-[13px] font-bold text-danger-text">
                      {badge}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 border-t border-line pt-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-soft text-base font-bold text-green-text">
          {currentUser.initials}
        </div>
        <div>
          <div className="text-base font-semibold text-ink">{currentUser.name}</div>
          <div className="text-[13px] text-ink-muted">{currentUser.note}</div>
        </div>
      </div>
    </nav>
  )
}

/** Shell constante de la app: sidebar de 250 px + área de contenido de cada pantalla. */
export function AppShell() {
  return (
    <div className="flex h-screen min-h-screen bg-canvas">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  )
}
