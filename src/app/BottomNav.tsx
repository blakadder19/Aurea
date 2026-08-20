import { Link, useLocation } from 'react-router-dom'

const TABS = [
  { label: 'Inicio', to: '/' },
  { label: 'Movimientos', to: '/movimientos' },
  { label: 'Presupuesto', to: '/presupuesto' },
  { label: 'Objetivos', to: '/objetivos' },
  { label: 'Más', to: '/mas' },
]

/**
 * Navegación inferior de cinco ítems, solo por debajo de 1024 px. El resto de
 * secciones del sidebar (Cuentas, Pagos, Inversiones, Deudas, Planificación,
 * Asistente, Ajustes) vive en «Más» — ver MorePage.
 */
export function BottomNav() {
  const location = useLocation()

  return (
    <nav className="grid min-h-14 grid-cols-5 border-t border-line bg-surface py-1.5 lg:hidden">
      {TABS.map((tab) => {
        const isActive = tab.to === '/' ? location.pathname === '/' : location.pathname.startsWith(tab.to)
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className="flex min-h-11 flex-col items-center justify-center gap-1 py-1.5"
          >
            <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-green' : 'bg-transparent'}`} />
            <span className={`text-[13px] ${isActive ? 'font-bold text-ink' : 'text-ink-muted'}`}>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
