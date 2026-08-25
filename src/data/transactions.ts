/**
 * Datos ficticios de Movimientos — miércoles 19 de agosto de 2026.
 * Tomados literalmente de build_aurea_movimientos/README.md.
 */

export interface Transaction {
  id: string
  fecha: string
  comercio: string
  cuenta: string
  categoria: string
  importe: number
  /** Solo en real: etiquetas libres que el usuario añade desde el panel de detalle. */
  tags?: string[]
  /** Solo en real: nota libre que el usuario añade desde el panel de detalle. */
  userNote?: string
  /** Solo en real: nombre personal que sustituye a `comercio` al mostrarlo, sin tocar el dato del banco. */
  displayName?: string | null
}

export const transactions: Transaction[] = [
  { id: 'mercadona', fecha: '19 ago', comercio: 'Mercadona', cuenta: 'Nómina · Openbank', categoria: 'Supermercado', importe: -62.18 },
  { id: 'verdeo-cafe', fecha: '18 ago', comercio: 'Verdeo Café', cuenta: 'Revolut', categoria: 'Restaurantes', importe: -9.4 },
  { id: 'amzn', fecha: '18 ago', comercio: 'AMZN Mktp ES', cuenta: 'Nómina · Openbank', categoria: 'Sin clasificar', importe: -34.9 },
  { id: 'renfe', fecha: '17 ago', comercio: 'Renfe', cuenta: 'Compartida · CaixaBank', categoria: 'Transporte', importe: -28.6 },
  { id: 'zara-devolucion', fecha: '16 ago', comercio: 'Zara · devolución', cuenta: 'Nómina · Openbank', categoria: 'Sin clasificar', importe: 49.95 },
  { id: 'iberdrola', fecha: '15 ago', comercio: 'Iberdrola', cuenta: 'Compartida · CaixaBank', categoria: 'Hogar', importe: -78.45 },
  { id: 'filmin', fecha: '14 ago', comercio: 'Filmin', cuenta: 'Nómina · Openbank', categoria: 'Ocio', importe: -7.99 },
  { id: 'estudio-nube', fecha: '13 ago', comercio: 'Estudio Nube · freelance', cuenta: 'Nómina · Openbank', categoria: 'Ingresos', importe: 640.0 },
]

/** Filas seleccionadas por defecto en la demo: AMZN Mktp ES y Zara · devolución. */
export const defaultSelectedIds = ['amzn', 'zara-devolucion']

export const filterAccounts = ['Nómina · Openbank', 'Compartida · CaixaBank', 'Revolut', 'Efectivo']

export const filterCategories = [
  'Supermercado',
  'Restaurantes',
  'Hogar y facturas',
  'Transporte',
  'Ocio y suscripciones',
  'Ropa y cuidado',
  'Salud',
  'Otros',
  'Ingresos',
  'Sin clasificar',
]

export const totalMovementsThisMonth = 148
export const monthContextLabel = 'agosto de 2026'

export const defaultUndoMessage = 'Categoría de «Verdeo Café» cambiada a Restaurantes.'

// --- Centro de revisión ------------------------------------------------

export type ConfidenceVariant = 'success' | 'warning' | 'danger'

export interface ReviewAction {
  label: string
  /** Estilo del botón, tal como en la referencia visual (no siempre el primero es el primario). */
  style: 'primary' | 'default' | 'muted'
  /** Mensaje mostrado en la barra de deshacer al resolver la tarjeta con esta acción. */
  message: string
}

export interface ReviewItem {
  id: string
  title: string
  meta: string
  confidenceLabel: string
  variant: ConfidenceVariant
  explanation: string
  actions: ReviewAction[]
}

export const initialReviewItems: ReviewItem[] = [
  {
    id: 'transferencia',
    title: 'Transferencia Openbank → Compartida · 1.120,45 €',
    meta: '18 ago · Confianza del 94 %',
    confidenceLabel: '94 % de confianza',
    variant: 'success',
    explanation:
      'Parece una transferencia entre tus cuentas: mismo importe el mismo día en Openbank y en tu cuenta compartida.',
    actions: [
      { label: 'Confirmar', style: 'primary', message: 'Transferencia Openbank → Compartida confirmada.' },
      { label: 'Corregir', style: 'default', message: 'Transferencia Openbank → Compartida corregida.' },
      { label: 'Descartar', style: 'default', message: 'Transferencia Openbank → Compartida descartada.' },
      { label: 'Crear regla', style: 'muted', message: 'Regla creada para transferencias Openbank → Compartida.' },
    ],
  },
  {
    id: 'zara',
    title: 'Zara · devolución · +49,95 €',
    meta: '16 ago · Confianza del 71 %',
    confidenceLabel: '71 % de confianza',
    variant: 'warning',
    explanation:
      'Sugerimos clasificarlo como ingreso porque el importe coincide con una devolución típica de Zara, no con tu sueldo habitual.',
    actions: [
      { label: 'Confirmar', style: 'primary', message: 'Zara · devolución confirmada como ingreso.' },
      { label: 'Corregir', style: 'default', message: 'Zara · devolución corregida.' },
      { label: 'Descartar', style: 'default', message: 'Zara · devolución descartada.' },
      { label: 'Crear regla', style: 'muted', message: 'Regla creada para devoluciones de Zara.' },
    ],
  },
  {
    id: 'amzn',
    title: 'AMZN Mktp ES · −34,90 €',
    meta: '18 ago · Confianza del 52 %',
    confidenceLabel: '52 % de confianza',
    variant: 'danger',
    explanation: 'Ambiguo entre Hogar y Ocio: has comprado ambos tipos de artículo en Amazon este mes.',
    actions: [
      { label: 'Elegir Hogar', style: 'default', message: 'AMZN Mktp ES clasificado como Hogar.' },
      { label: 'Elegir Ocio', style: 'default', message: 'AMZN Mktp ES clasificado como Ocio.' },
      { label: 'Descartar', style: 'muted', message: 'AMZN Mktp ES descartado.' },
    ],
  },
  {
    id: 'spotify',
    title: 'Spotify sube de 10,99 € a 11,99 €',
    meta: '24 ago · Detectado por cambio de importe',
    confidenceLabel: 'Subida de precio',
    variant: 'warning',
    explanation:
      'Es el mismo servicio y la misma cuenta que el mes pasado, solo cambia el importe. Se actualizará el historial de la suscripción.',
    actions: [
      { label: 'Aceptar el cambio', style: 'primary', message: 'Precio de Spotify actualizado a 11,99 €.' },
      { label: 'Ver suscripción', style: 'default', message: 'Suscripción de Spotify revisada.' },
    ],
  },
]
