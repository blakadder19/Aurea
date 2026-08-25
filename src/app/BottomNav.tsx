import { Link, useLocation } from 'react-router-dom'
import { NAV_ICONS } from './NavIcons'

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
            className="flex min-h-11 flex-col items-center justify-center gap-0.5 py-1.5"
          >
            <span aria-hidden="true" className={`h-[19px] w-[19px] ${isActive ? 'text-brand' : 'text-ink-faint'}`}>
              {NAV_ICONS[tab.label]}
            </span>
            <span className={`text-[11.5px] ${isActive ? 'font-bold text-ink' : 'text-ink-muted'}`}>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
