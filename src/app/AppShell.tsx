import { Suspense } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { currentUser } from '../data/demo'
import { useTransactionsStore } from '../features/transactions/store'
import { useRealCategories } from '../features/transactions/useRealCategories'
import { isTransactionPending, useRealTransactions } from '../features/transactions/useRealTransactions'
import { isSupabaseConfigured } from '../lib/supabase/client'
import { useAuthStore } from '../lib/supabase/useAuth'
import { usePrivacyStore } from '../store/usePrivacyStore'
import { BottomNav } from './BottomNav'
import { NAV_ICONS } from './NavIcons'
import { RouteFallback } from './RouteFallback'

/** "blakadder2" → "BL"; si el correo no tiene letras, cae en las dos primeras posiciones tal cual. */
function initialsFromEmail(email: string): string {
  const local = email.split('@')[0] ?? ''
  const letters = local.replace(/[^a-zA-Z]/g, '')
  return (letters.slice(0, 2) || local.slice(0, 2) || '??').toUpperCase()
}

/** Identidad a mostrar en la barra/menú: el correo real de la sesión, o la persona de demostración sin sesión. No hay nombre real guardado (login por enlace mágico) — el correo es lo único honesto que mostrar. */
export function useIdentity(): { initials: string; name: string; note: string } {
  const session = useAuthStore((s) => s.session)
  if (session?.user.email) {
    return { initials: initialsFromEmail(session.user.email), name: session.user.email, note: 'Sesión real' }
  }
  return currentUser
}

export interface NavItem {
  label: string
  to?: string
  badge?: number
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
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
      { label: 'Objetivos', to: '/objetivos' },
    ],
  },
  {
    title: 'Crecimiento',
    items: [
      { label: 'Inversiones', to: '/inversiones' },
      { label: 'Deudas', to: '/deudas' },
      { label: 'Planificación', to: '/planificacion' },
    ],
  },
  {
    title: 'Herramientas',
    items: [
      { label: 'Informes', to: '/informes' },
      { label: 'Asistente e insights', to: '/asistente' },
      { label: 'Conexiones y ajustes', to: '/ajustes' },
    ],
  },
]

/** Barra lateral fija de 250 px. Inicio, Movimientos y Presupuesto navegan: el resto llega en cortes posteriores. */
function Sidebar() {
  const location = useLocation()
  const session = useAuthStore((s) => s.session)
  const demoReviewCount = useTransactionsStore((s) => s.reviewItems.length)
  const { categories: realCategories } = useRealCategories()
  const { transactions: realTransactions } = useRealTransactions(realCategories)
  const reviewCount =
    session !== null && realTransactions !== null ? realTransactions.filter(isTransactionPending).length : demoReviewCount
  const identity = useIdentity()

  return (
    <nav className="hidden w-[250px] shrink-0 flex-col gap-6 border-r border-line bg-surface p-5 py-7 lg:flex">
      <div className="flex items-center gap-2.5 px-1">
        <div className="h-8 w-8 shrink-0 rounded-[10px] bg-gradient-to-br from-brand to-plum" aria-hidden="true" />
        <div className="font-serif text-[19px] font-extrabold text-ink">Áurea</div>
      </div>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="flex flex-col gap-1">
            <div className="px-2.5 pb-1.5 text-[12px] font-bold uppercase tracking-[0.07em] text-ink-faint">
              {section.title}
            </div>
            {section.items.map((item) => {
              const isActive = item.to !== undefined && location.pathname === item.to
              const rowClasses = 'flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] font-semibold'
              const badge = item.label === 'Movimientos' ? reviewCount : item.badge
              const icon = NAV_ICONS[item.label]

              if (item.to) {
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className={`${rowClasses} ${
                      isActive ? 'bg-brand-soft text-brand-text' : 'text-ink-muted hover:bg-canvas hover:text-ink'
                    }`}
                  >
                    {icon && (
                      <span aria-hidden="true" className="h-[18px] w-[18px] shrink-0">
                        {icon}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {!!badge && (
                      <span className="rounded-full bg-danger px-2 py-0.5 text-[12px] font-bold text-surface">{badge}</span>
                    )}
                  </Link>
                )
              }

              return (
                <div key={item.label} className={`${rowClasses} text-ink-faint`}>
                  {icon && (
                    <span aria-hidden="true" className="h-[18px] w-[18px] shrink-0">
                      {icon}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {!!badge && (
                    <span className="rounded-full bg-danger px-2 py-0.5 text-[12px] font-bold text-surface">{badge}</span>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 border-t border-line pt-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-plum to-brand text-[13px] font-bold text-surface">
            {identity.initials}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[14px] font-bold text-ink">{identity.name}</div>
            <div className="truncate text-[12px] text-ink-faint">{identity.note}</div>
          </div>
        </div>
        <PrivacyToggle />
        <AuthLink />
      </div>
    </nav>
  )
}

/** Modo privacidad: oculta todas las cifras de la app tras un antifaz, en toda pestaña/recarga. */
export function PrivacyToggle() {
  const hidden = usePrivacyStore((s) => s.hidden)
  const toggle = usePrivacyStore((s) => s.toggle)

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={hidden}
      className="flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 text-left text-[13.5px] font-bold text-ink-muted hover:bg-canvas"
    >
      <span aria-hidden="true">{hidden ? '◌' : '●'}</span>
      {hidden ? 'Mostrar cifras' : 'Ocultar cifras'}
    </button>
  )
}

/** Enlace de acceso real: entrar (con tu banco) o cerrar la sesión real ya iniciada. */
function AuthLink() {
  const session = useAuthStore((s) => s.session)
  const signOut = useAuthStore((s) => s.signOut)

  if (!isSupabaseConfigured) return null

  if (session) {
    return (
      <button
        type="button"
        onClick={() => void signOut()}
        className="min-h-11 rounded-md border border-line px-3 text-left text-[15px] font-semibold text-ink-muted hover:bg-canvas"
      >
        Cerrar sesión real
      </button>
    )
  }

  return (
    <Link
      to="/entrar"
      className="min-h-11 rounded-md border border-line px-3 py-2.5 text-[15px] font-semibold text-brand hover:bg-canvas"
    >
      Entrar con tu banco real
    </Link>
  )
}

/** Shell constante de la app: sidebar de 250 px + área de contenido de cada pantalla. */
export function AppShell() {
  return (
    <div className="flex h-screen min-h-screen bg-canvas">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col">
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </div>
        <BottomNav />
      </div>
    </div>
  )
}
