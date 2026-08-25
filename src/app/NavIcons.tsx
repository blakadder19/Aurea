/** Iconos de navegación: trazo simple de 2px, coherente con el resto del sistema. */
const ICON_PROPS = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export const NAV_ICONS: Record<string, React.ReactNode> = {
  Inicio: (
    <svg {...ICON_PROPS}>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v9a1 1 0 0 0 1 1h3v-6h6v6h3a1 1 0 0 0 1-1v-9" />
    </svg>
  ),
  'Cuentas y patrimonio': (
    <svg {...ICON_PROPS}>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h4" />
    </svg>
  ),
  Movimientos: (
    <svg {...ICON_PROPS}>
      <path d="M8 3v4M16 3v4" />
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 11h18" />
    </svg>
  ),
  Presupuesto: (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  ),
  'Pagos y suscripciones': (
    <svg {...ICON_PROPS}>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M4 10h16" />
    </svg>
  ),
  Objetivos: (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="8" />
    </svg>
  ),
  Inversiones: (
    <svg {...ICON_PROPS}>
      <path d="M3 17l6-6 4 4 7-8" />
      <path d="M15 7h5v5" />
    </svg>
  ),
  Deudas: (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8" />
    </svg>
  ),
  Planificación: (
    <svg {...ICON_PROPS}>
      <path d="M3 20h18" />
      <path d="M6 20V10M12 20V4M18 20v14" />
    </svg>
  ),
  'Asistente e insights': (
    <svg {...ICON_PROPS}>
      <path d="M12 3l1.6 4.2L18 9l-4.4 1.8L12 15l-1.6-4.2L6 9l4.4-1.8Z" />
      <path d="M19 15l.7 1.8L21.5 17.5l-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7Z" />
    </svg>
  ),
  Más: (
    <svg {...ICON_PROPS}>
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  ),
  Informes: (
    <svg {...ICON_PROPS}>
      <rect x="4" y="11" width="4" height="9" rx="1" />
      <rect x="10" y="6" width="4" height="14" rx="1" />
      <rect x="16" y="14" width="4" height="6" rx="1" />
    </svg>
  ),
  'Conexiones y ajustes': (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  ),
}
