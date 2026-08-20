/**
 * Datos ficticios de Pagos y suscripciones — agosto de 2026.
 * Los importes y fechas de Netflix, Spotify, Luz, Internet, Coche, Seguro
 * hogar, Hipoteca y Gimnasio cuadran exactamente con los "próximos 14 días"
 * de Inicio (ver docs/DUDAS.md sobre los subtotales, que se recalculan en
 * código en vez de copiar los del .dc.html, que no cuadraban).
 */

export type RecurringCategory = 'esenciales' | 'suscripciones' | 'otros'

export interface HistoryEntry {
  date: string
  amount: number
}

export interface HighlightAction {
  label: string
  /** 'resolve' descarta el caso y muestra la barra de deshacer; 'view' abre el panel de detalle. */
  kind: 'resolve' | 'view'
}

export interface RecurringHighlight {
  variant: 'warning' | 'danger' | 'info'
  icon: string
  badge: string
  explanation: string
  actions: HighlightAction[]
  resolvedMessage: string
}

export interface RecurringItem {
  id: string
  name: string
  /** Nombre corto para la celda del calendario, donde el importe nunca puede envolver. */
  shortName: string
  account: string
  nextChargeLabel: string
  /** Día del mes de agosto en que carga, si aplica (para el calendario). */
  nextChargeDay: number | null
  frequency: string
  amount: number
  category: RecurringCategory
  highlight?: RecurringHighlight
  history: HistoryEntry[]
}

export const recurringItems: RecurringItem[] = [
  {
    id: 'luz',
    name: 'Luz · Iberdrola',
    shortName: 'Luz',
    account: 'Compartida · CaixaBank',
    nextChargeLabel: '25 ago',
    nextChargeDay: 25,
    frequency: 'Mensual',
    amount: 78.45,
    category: 'esenciales',
    history: [
      { date: '25 jul', amount: 78.45 },
      { date: '25 jun', amount: 74.2 },
      { date: '25 may', amount: 71.8 },
    ],
  },
  {
    id: 'internet',
    name: 'Internet y móvil',
    shortName: 'Internet',
    account: 'Compartida · CaixaBank',
    nextChargeLabel: '27 ago',
    nextChargeDay: 27,
    frequency: 'Mensual',
    amount: 46.9,
    category: 'esenciales',
    history: [
      { date: '27 jul', amount: 46.9 },
      { date: '27 jun', amount: 46.9 },
      { date: '27 may', amount: 46.9 },
    ],
  },
  {
    id: 'seguro-hogar',
    name: 'Seguro del hogar',
    shortName: 'Seguro hogar',
    account: 'Compartida · CaixaBank',
    nextChargeLabel: '30 ago',
    nextChargeDay: 30,
    frequency: 'Mensual',
    amount: 31.2,
    category: 'esenciales',
    history: [
      { date: '30 jul', amount: 31.2 },
      { date: '30 jun', amount: 31.2 },
      { date: '30 may', amount: 31.2 },
    ],
  },
  {
    id: 'netflix',
    name: 'Netflix',
    shortName: 'Netflix',
    account: 'Nómina · Openbank',
    nextChargeLabel: '22 ago',
    nextChargeDay: 22,
    frequency: 'Mensual',
    amount: 13.99,
    category: 'suscripciones',
    history: [
      { date: '22 jul', amount: 13.99 },
      { date: '22 jun', amount: 13.99 },
      { date: '22 may', amount: 13.99 },
    ],
  },
  {
    id: 'spotify',
    name: 'Spotify',
    shortName: 'Spotify',
    account: 'Nómina · Openbank',
    nextChargeLabel: '24 ago',
    nextChargeDay: 24,
    frequency: 'Mensual',
    amount: 11.99,
    category: 'suscripciones',
    highlight: {
      variant: 'warning',
      icon: '▲',
      badge: 'Sube de precio',
      explanation: 'Spotify pasa de 10,99 € a 11,99 € el 24 ago. 12 € más al año.',
      actions: [
        { label: 'Aceptar el cambio', kind: 'resolve' },
        { label: 'Ver suscripción', kind: 'view' },
      ],
      resolvedMessage: 'Subida de precio de Spotify aceptada.',
    },
    history: [
      { date: '24 jul', amount: 10.99 },
      { date: '24 jun', amount: 10.99 },
      { date: '24 may', amount: 10.99 },
    ],
  },
  {
    id: 'filmin',
    name: 'Filmin',
    shortName: 'Filmin',
    account: 'Nómina · Openbank',
    nextChargeLabel: '22 ago',
    nextChargeDay: 22,
    frequency: 'Mensual',
    amount: 7.99,
    category: 'suscripciones',
    highlight: {
      variant: 'danger',
      icon: '!',
      badge: 'Prueba termina en 3 días',
      explanation: 'Es una prueba gratuita que pasa a 7,99 €/mes el 22 ago si no la cancelas antes.',
      actions: [
        { label: 'Cancelar antes del 14 sep', kind: 'resolve' },
        { label: 'Ver suscripción', kind: 'view' },
      ],
      resolvedMessage: 'Prueba de Filmin marcada para cancelar antes del 14 sep.',
    },
    history: [],
  },
  {
    id: 'gimnasio',
    name: 'Gimnasio',
    shortName: 'Gimnasio',
    account: 'Nómina · Openbank y Revolut',
    nextChargeLabel: '1 sep',
    nextChargeDay: null,
    frequency: 'Mensual',
    amount: 39.9,
    category: 'suscripciones',
    highlight: {
      variant: 'info',
      icon: '!',
      badge: 'Posible duplicado',
      explanation: 'Dos cargos parecidos: 39,90 € y 39,90 € en cuentas distintas.',
      actions: [
        { label: 'Comparar cargos', kind: 'view' },
        { label: 'No es duplicado', kind: 'resolve' },
      ],
      resolvedMessage: 'Gimnasio marcado como no duplicado.',
    },
    history: [
      { date: '1 ago · Nómina · Openbank', amount: 39.9 },
      { date: '1 ago · Revolut', amount: 39.9 },
    ],
  },
  {
    id: 'prestamo-coche',
    name: 'Préstamo del coche',
    shortName: 'Préstamo coche',
    account: 'Nómina · Openbank',
    nextChargeLabel: '28 ago',
    nextChargeDay: 28,
    frequency: 'Mensual',
    amount: 186.2,
    category: 'otros',
    history: [
      { date: '28 jul', amount: 186.2 },
      { date: '28 jun', amount: 186.2 },
      { date: '28 may', amount: 186.2 },
    ],
  },
  {
    id: 'hipoteca',
    name: 'Hipoteca',
    shortName: 'Hipoteca',
    account: 'Nómina · Openbank',
    nextChargeLabel: '1 sep',
    nextChargeDay: null,
    frequency: 'Mensual',
    amount: 612.4,
    category: 'otros',
    history: [
      { date: '1 ago', amount: 612.4 },
      { date: '1 jul', amount: 612.4 },
      { date: '1 jun', amount: 612.4 },
    ],
  },
  {
    id: 'portatil',
    name: 'Portátil a plazos',
    shortName: 'Portátil',
    account: 'Nómina · Openbank',
    nextChargeLabel: '10 sep',
    nextChargeDay: null,
    frequency: 'Cuota 3 de 4 · sin intereses',
    amount: 180.0,
    category: 'otros',
    history: [
      { date: '10 ago', amount: 180.0 },
      { date: '10 jul', amount: 180.0 },
    ],
  },
]

/** 31 días de agosto de 2026 (empieza en sábado). Un día puede acumular varios cargos. */
export function augustCalendarDays() {
  const daysInMonth = 31
  const firstWeekday = (new Date(2026, 7, 1).getDay() + 6) % 7 // lunes = 0
  const cells: { day: number | null; items: RecurringItem[] }[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push({ day: null, items: [] })
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, items: recurringItems.filter((r) => r.nextChargeDay === day) })
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, items: [] })
  return cells
}

export const income31Ago = { label: 'Nómina', amount: 3150.0 }
