/**
 * Datos ficticios de Marta Ríos — miércoles 19 de agosto de 2026.
 * Tomados literalmente de build_aurea_inicio/README.md; cuadran entre sí.
 */

export const CONTEXT_DATE = new Date(2026, 7, 19) // 19 ago 2026 (mes 0-indexado)

// --- Bloque 1: Disponible hoy -------------------------------------------

export interface EligibleAccount {
  label: string
  amount: number
}

export const eligibleAccounts: EligibleAccount[] = [
  { label: 'Nómina · Openbank', amount: 4238.64 },
  { label: 'Cuenta compartida · CaixaBank', amount: 1120.45 },
  { label: 'Revolut · 1.860,00 USD a 0,9180', amount: 1707.48 },
  { label: 'Efectivo', amount: 180.0 },
]

export const eligibleAccountsSum = 7246.57
export const commitments14d = 1863.33
export const commitmentsLabel = 'Compromisos hasta el 2 sep (9 pagos)'
export const availableToday = 5383.24

export interface OutsideAvailableItem {
  label: string
  amount: number
  pending?: boolean
}

export const outsideAvailable: OutsideAvailableItem[] = [
  { label: 'Ahorro', amount: 12400.0 },
  { label: 'Hucha «Viaje Japón»', amount: 2150.0, pending: true },
  { label: 'Inversiones', amount: 38920.0 },
  { label: 'Cripto', amount: 4310.0 },
  { label: 'Crédito de la tarjeta', amount: 3157.7 },
]

// --- Bloque 2: Patrimonio neto -------------------------------------------

export const netWorth = 188164.27
export const netWorthDelta = 1284
export const netWorthDeltaPct = 0.7
export const assets = 344526.57
export const liabilities = 156362.3

export interface NetWorthPoint {
  month: string
  value: number
}

export const netWorthSeries: NetWorthPoint[] = [
  { month: 'sep 2025', value: 172410.5 },
  { month: 'oct 2025', value: 173860.2 },
  { month: 'nov 2025', value: 175102.75 },
  { month: 'dic 2025', value: 176340.1 },
  { month: 'ene 2026', value: 177050.85 },
  { month: 'feb 2026', value: 178610.4 },
  { month: 'mar 2026', value: 180225.95 },
  { month: 'abr 2026', value: 181940.3 },
  { month: 'may 2026', value: 183470.85 },
  { month: 'jun 2026', value: 185110.6 },
  { month: 'jul 2026', value: 186880.27 },
  { month: 'ago 2026', value: 188164.27 },
]

// --- Bloque 3: Presupuesto ------------------------------------------------

export const budget = {
  headline: 'Vas 145 € por encima del ritmo previsto',
  budgeted: 2400,
  spent: 1612,
  committed: 288,
  remaining: 500,
  forecast: 2545,
  forecastDelta: 145,
  paceReal: 67,
  paceExpected: 61,
  dayOfMonth: 19,
  daysInMonth: 31,
}

export interface BudgetCategory {
  name: string
  budgeted: number
  spent: number
  status: string
  variant: 'success' | 'warning' | 'danger'
}

export const budgetCategories: BudgetCategory[] = [
  { name: 'Supermercado', budgeted: 480, spent: 312, status: 'Al día', variant: 'success' },
  { name: 'Restaurantes', budgeted: 400, spent: 312, status: 'Por encima del ritmo', variant: 'warning' },
  { name: 'Hogar y facturas', budgeted: 620, spent: 404, status: 'Al día', variant: 'success' },
  { name: 'Transporte', budgeted: 160, spent: 96, status: 'Por encima del ritmo', variant: 'warning' },
  { name: 'Ocio y suscripciones', budgeted: 240, spent: 148, status: 'Al día', variant: 'success' },
  { name: 'Ropa y cuidado', budgeted: 200, spent: 84, status: 'Al día', variant: 'success' },
  { name: 'Salud', budgeted: 120, spent: 38, status: 'Al día', variant: 'success' },
  { name: 'Otros', budgeted: 180, spent: 218, status: 'Presupuesto agotado', variant: 'danger' },
]

// --- Bloque 4: Próximos 14 días -------------------------------------------

export type TimelineTier = 'today' | 'lower' | 'upper'

export interface TimelineEvent {
  day: string
  column: number
  label: string
  amount: number
  tier: TimelineTier
  align?: 'right'
}

export const timelineDays = [
  '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '1 sep', '2 sep',
]

export const timelineEvents: TimelineEvent[] = [
  { day: '19', column: 1, label: 'Hoy', amount: 0, tier: 'today' },
  { day: '22 ago', column: 4, label: 'Netflix', amount: -13.99, tier: 'lower' },
  { day: '24 ago', column: 6, label: 'Spotify', amount: -11.99, tier: 'upper' },
  { day: '25 ago', column: 7, label: 'Luz', amount: -78.45, tier: 'lower' },
  { day: '27 ago', column: 9, label: 'Internet y móvil', amount: -46.9, tier: 'upper' },
  { day: '28 ago', column: 10, label: 'Préstamo coche', amount: -186.2, tier: 'lower' },
  { day: '30 ago', column: 12, label: 'Seguro hogar', amount: -31.2, tier: 'upper' },
  { day: '31 ago', column: 13, label: 'Nómina', amount: 3150.0, tier: 'lower' },
  { day: '1 sep', column: 14, label: 'Hipoteca · gimnasio', amount: -652.3, tier: 'upper' },
  { day: '2 sep', column: 15, label: 'Tarjeta', amount: -842.3, tier: 'lower', align: 'right' },
]

export const next14Days = {
  totalOut: 1863.33,
  totalIn: 3150.0,
  rangeLabel: 'Del 19 ago al 2 sep · 9 pagos y 1 cobro',
}

export interface Hito {
  fecha: string
  concepto: string
  tipo: string
  cuenta: string
  importe: number
}

export const hitos: Hito[] = [
  { fecha: '22 ago', concepto: 'Netflix', tipo: 'Suscripción', cuenta: 'Nómina · Openbank', importe: -13.99 },
  { fecha: '24 ago', concepto: 'Spotify', tipo: 'Suscripción · sube de precio', cuenta: 'Nómina · Openbank', importe: -11.99 },
  { fecha: '25 ago', concepto: 'Luz · Iberdrola', tipo: 'Factura esencial', cuenta: 'Compartida · CaixaBank', importe: -78.45 },
  { fecha: '27 ago', concepto: 'Internet y móvil', tipo: 'Factura esencial', cuenta: 'Compartida · CaixaBank', importe: -46.9 },
  { fecha: '28 ago', concepto: 'Préstamo coche', tipo: 'Cuota de deuda', cuenta: 'Nómina · Openbank', importe: -186.2 },
  { fecha: '30 ago', concepto: 'Seguro del hogar', tipo: 'Factura esencial', cuenta: 'Compartida · CaixaBank', importe: -31.2 },
  { fecha: '31 ago', concepto: 'Nómina', tipo: 'Ingreso', cuenta: 'Nómina · Openbank', importe: 3150.0 },
  { fecha: '1 sep', concepto: 'Hipoteca', tipo: 'Cuota de deuda', cuenta: 'Nómina · Openbank', importe: -612.4 },
  { fecha: '1 sep', concepto: 'Gimnasio', tipo: 'Suscripción', cuenta: 'Nómina · Openbank', importe: -39.9 },
  { fecha: '2 sep', concepto: 'Tarjeta de crédito', tipo: 'Pago de tarjeta', cuenta: 'Openbank Visa', importe: -842.3 },
]

// --- Bloque 5: Necesita tu atención ---------------------------------------

export interface AttentionItem {
  status: string
  variant: 'danger' | 'warning' | 'pending'
  headline: string
  detail: string
  /** `to`: solo en real, navega a la pantalla relevante en vez de ser decorativo. */
  actions: { label: string; primary?: boolean; to?: string }[]
}

export const attentionItems: AttentionItem[] = [
  {
    status: 'Requiere revisión',
    variant: 'danger',
    headline: '4 movimientos esperan tu confirmación',
    detail: 'Entre ellos una devolución de Zara de 49,95 € clasificada como ingreso.',
    actions: [{ label: 'Abrir Centro de revisión', primary: true }],
  },
  {
    status: 'Subida de precio',
    variant: 'warning',
    headline: 'Spotify pasa de 10,99 € a 11,99 € el 24 ago',
    detail: '12 € más al año. Se cobra en la cuenta de nómina.',
    actions: [{ label: 'Aceptar el cambio' }, { label: 'Ver suscripción' }],
  },
  {
    status: 'Por confirmar',
    variant: 'pending',
    headline: 'La hucha «Viaje Japón» aún no cuenta en tus cifras',
    detail: '2.150,00 € detectados en CaixaBank. Dile qué función tiene para incluirla.',
    actions: [{ label: 'Asignar función' }],
  },
  {
    status: 'Pago grande a la vista',
    variant: 'danger',
    headline: 'La tarjeta carga 842,30 € el 2 sep',
    detail: 'Es el mayor pago del periodo. Ya está descontado de Disponible hoy.',
    actions: [{ label: 'Ver detalle de la tarjeta' }],
  },
]

// --- Bloque 6: Insight explicable ------------------------------------------

export const insight = {
  headline: 'Tres ajustes pequeños dejan el mes en 2.400 €',
  body: 'La previsión de cierre son 2.545 €. Estos 145 € de más vienen sobre todo de restaurantes y transporte.',
  breakdown: [
    { label: 'Restaurantes: 312 € en 19 días → ritmo 509 €/mes', delta: 109 },
    { label: 'Transporte: 96 € frente a 60 € previstos', delta: 36 },
  ],
  total: 145,
}

// --- Bloque 7: Últimos movimientos -----------------------------------------

export type MovementStatus = 'Confirmado' | 'Requiere revisión'

export interface Movement {
  fecha: string
  comercio: string
  categoria: string
  cuenta: string
  estado: MovementStatus
  importe: number
}

export const movimientos: Movement[] = [
  { fecha: '19 ago', comercio: 'Mercadona', categoria: 'Supermercado', cuenta: 'Nómina · Openbank', estado: 'Confirmado', importe: -62.18 },
  { fecha: '18 ago', comercio: 'Verdeo Café', categoria: 'Restaurantes', cuenta: 'Revolut', estado: 'Confirmado', importe: -9.4 },
  { fecha: '18 ago', comercio: 'AMZN Mktp ES', categoria: 'Sin clasificar', cuenta: 'Nómina · Openbank', estado: 'Requiere revisión', importe: -34.9 },
  { fecha: '17 ago', comercio: 'Renfe', categoria: 'Transporte', cuenta: 'Compartida · CaixaBank', estado: 'Confirmado', importe: -28.6 },
  { fecha: '16 ago', comercio: 'Zara · devolución', categoria: 'Ropa', cuenta: 'Nómina · Openbank', estado: 'Requiere revisión', importe: 49.95 },
  { fecha: '15 ago', comercio: 'Iberdrola', categoria: 'Hogar', cuenta: 'Compartida · CaixaBank', estado: 'Confirmado', importe: -78.45 },
  { fecha: '14 ago', comercio: 'Filmin', categoria: 'Ocio', cuenta: 'Nómina · Openbank', estado: 'Confirmado', importe: -7.99 },
  { fecha: '13 ago', comercio: 'Estudio Nube · freelance', categoria: 'Ingresos', cuenta: 'Nómina · Openbank', estado: 'Confirmado', importe: 640.0 },
]

export const totalMovementsThisMonth = 148

// --- Barra de confirmación --------------------------------------------------

export const undoBanner = {
  message: 'Categoría de «Verdeo Café» cambiada a Restaurantes.',
}

// --- Usuario / sincronización -----------------------------------------------

export const currentUser = { name: 'Marta Ríos', initials: 'MR', note: 'Datos de demostración' }
export const syncedAt = '08:42'
export const alertsCount = 4
