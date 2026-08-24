/**
 * Datos ficticios de Cuentas y patrimonio — miércoles 19 de agosto de 2026.
 * Cuadran con PLAN.md y con Inicio (corte 1): Activos 344.526,57 € −
 * Pasivos 156.362,30 € = Patrimonio neto 188.164,27 €.
 *
 * Nota (ver docs/DUDAS.md): el .dc.html de referencia da "Piso · valor
 * estimado" = 285.000,00 €, pero eso desborda el total canónico de Activos
 * en exactamente 5.500 €. Se corrige a 279.500,00 € para que la tabla
 * cuadre con los tres KPIs de cabecera.
 */

export const netWorthKpis = {
  assets: 344526.57,
  liabilities: 156362.3,
  netWorth: 188164.27,
  netWorthDelta: 1284,
}

export type AccountFunction = 'Para gastar' | 'Ahorro' | 'Inversión' | 'Deuda' | 'Activo manual' | 'Por confirmar'

export interface AccountMovement {
  date: string
  label: string
  amount: number
}

export interface Account {
  id: string
  name: string
  institution: string
  fn: AccountFunction
  balance: number
  /** Solo Revolut: divisa distinta del euro. */
  foreign?: { amount: number; currency: string; rate: number; rateDate: string }
  countsInAvailableToday: boolean
  recentMovements: AccountMovement[]
  /** % del saldo que cuenta como patrimonio propio (cuentas compartidas). undefined = 100, como siempre. */
  sharePercent?: number
  /** Código ISO de la divisa real del saldo. undefined = EUR (todas las cuentas demo). */
  currency?: string
}

export const accounts: Account[] = [
  {
    id: 'nomina',
    name: 'Nómina',
    institution: 'Openbank',
    fn: 'Para gastar',
    balance: 4238.64,
    countsInAvailableToday: true,
    recentMovements: [
      { date: '19 ago', label: 'Mercadona', amount: -62.18 },
      { date: '13 ago', label: 'Estudio Nube · freelance', amount: 640.0 },
    ],
  },
  {
    id: 'compartida',
    name: 'Cuenta compartida',
    institution: 'CaixaBank',
    fn: 'Para gastar',
    balance: 1120.45,
    countsInAvailableToday: true,
    recentMovements: [
      { date: '17 ago', label: 'Renfe', amount: -28.6 },
      { date: '15 ago', label: 'Iberdrola', amount: -78.45 },
    ],
  },
  {
    id: 'revolut',
    name: 'Revolut',
    institution: 'Revolut',
    fn: 'Para gastar',
    balance: 1707.48,
    foreign: { amount: 1860.0, currency: 'USD', rate: 0.918, rateDate: '19 ago' },
    countsInAvailableToday: true,
    recentMovements: [
      { date: '18 ago', label: 'Verdeo Café', amount: -9.4 },
      { date: '12 ago', label: 'Ingreso freelance USD', amount: 380.0 },
    ],
  },
  {
    id: 'efectivo',
    name: 'Efectivo',
    institution: 'Manual',
    fn: 'Para gastar',
    balance: 180.0,
    countsInAvailableToday: true,
    recentMovements: [],
  },
  {
    id: 'ahorro',
    name: 'Ahorro',
    institution: 'ING',
    fn: 'Ahorro',
    balance: 12400.0,
    countsInAvailableToday: false,
    recentMovements: [{ date: '1 ago', label: 'Transferencia automática', amount: 200.0 }],
  },
  {
    id: 'hucha-japon',
    name: 'Hucha «Viaje Japón»',
    institution: 'CaixaBank',
    fn: 'Por confirmar',
    balance: 2150.0,
    countsInAvailableToday: false,
    recentMovements: [{ date: '3 ago', label: 'Transferencia manual', amount: 150.0 }],
  },
  {
    id: 'fondo-indexado',
    name: 'Fondo indexado',
    institution: 'MyInvestor',
    fn: 'Inversión',
    balance: 38920.0,
    countsInAvailableToday: false,
    recentMovements: [{ date: '5 ago', label: 'Aportación automática', amount: 300.0 }],
  },
  {
    id: 'cripto',
    name: 'Cripto',
    institution: 'Coinbase',
    fn: 'Inversión',
    balance: 4310.0,
    countsInAvailableToday: false,
    recentMovements: [],
  },
  {
    id: 'piso',
    name: 'Piso · valor estimado',
    institution: 'Tasación 2024',
    fn: 'Activo manual',
    balance: 279500.0,
    countsInAvailableToday: false,
    recentMovements: [],
  },
  {
    id: 'hipoteca',
    name: 'Hipoteca',
    institution: 'Bankinter',
    fn: 'Deuda',
    balance: -148320.0,
    countsInAvailableToday: false,
    recentMovements: [{ date: '1 ago', label: 'Cuota mensual', amount: -612.4 }],
  },
  {
    id: 'otras-deudas',
    name: 'Préstamo coche, tarjeta y portátil',
    institution: 'Varias',
    fn: 'Deuda',
    balance: -8042.3,
    countsInAvailableToday: false,
    recentMovements: [
      { date: '28 ago', label: 'Cuota préstamo coche', amount: -186.2 },
      { date: '2 sep', label: 'Pago de tarjeta', amount: -842.3 },
    ],
  },
]

export const assetClassBreakdown = [
  { label: 'Efectivo y cuentas', amount: 7246.57 + 12400.0 + 2150.0 },
  { label: 'Inmuebles', amount: 279500.0 },
  { label: 'Inversiones y cripto', amount: 38920.0 + 4310.0 },
  { label: 'Deudas', amount: -(148320.0 + 8042.3), negative: true },
]

export const institutionBreakdown = [
  { label: 'Openbank', amount: 4238.64 },
  { label: 'CaixaBank', amount: 1120.45 + 2150.0 },
  { label: 'Revolut', amount: 1707.48 },
  { label: 'ING', amount: 12400.0 },
  { label: 'MyInvestor', amount: 38920.0 },
  { label: 'Coinbase', amount: 4310.0 },
  { label: 'Bankinter', amount: -148320.0, negative: true },
  { label: 'Varias', amount: -8042.3, negative: true },
]
