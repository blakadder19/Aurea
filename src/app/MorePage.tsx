import { Link } from 'react-router-dom'
import { NAV_SECTIONS, PrivacyToggle, useIdentity } from './AppShell'

const BOTTOM_TAB_ROUTES = new Set(['/', '/movimientos', '/presupuesto', '/objetivos'])

/** «Más»: el resto del sidebar que no cabe en la navegación inferior de móvil. */
export function MorePage() {
  const identity = useIdentity()
  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.to && !BOTTOM_TAB_ROUTES.has(item.to)),
  })).filter((section) => section.items.length > 0)

  return (
    <>
      <header className="border-b border-line bg-surface px-4 py-5">
        <h1 className="font-serif text-[32px] font-semibold tracking-[-0.01em] text-ink">Más</h1>
        <div className="mt-1 text-base text-ink-muted">Todas las secciones de Áurea</div>
      </header>
      <main className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
        {sections.map((section) => (
          <div key={section.title} className="flex flex-col gap-2">
            <div className="px-1 text-[13px] font-semibold tracking-[0.08em] text-ink-muted uppercase">
              {section.title}
            </div>
            <div className="flex flex-col gap-2">
              {section.items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to!}
                  className="flex min-h-11 items-center rounded-[14px] border border-line bg-surface px-4 text-base font-semibold text-ink"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}

        <div className="flex flex-col gap-2">
          <div className="px-1 text-[13px] font-semibold tracking-[0.08em] text-ink-muted uppercase">Desarrollo</div>
          <Link
            to="/estados"
            className="flex min-h-11 items-center rounded-[14px] border border-line bg-surface px-4 text-base font-semibold text-ink"
          >
            Estados del sistema
          </Link>
        </div>

        <div className="mt-2 flex flex-col gap-3 border-t border-line pt-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-soft text-base font-bold text-green-text">
              {identity.initials}
            </div>
            <div>
              <div className="text-base font-semibold text-ink">{identity.name}</div>
              <div className="text-[13px] text-ink-muted">{identity.note}</div>
            </div>
          </div>
          <PrivacyToggle />
        </div>
      </main>
    </>
  )
}
