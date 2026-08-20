/**
 * Datos ficticios de Conexiones y ajustes — miércoles 19 de agosto de 2026.
 * Las seis conexiones y el resultado de la importación CSV son de demostración.
 */

export type ConnectionStatus = 'synced' | 'syncing' | 'error'

export interface Connection {
  id: string
  name: string
  status: ConnectionStatus
  detail: string
}

export const connections: Connection[] = [
  { id: 'openbank', name: 'Openbank', status: 'synced', detail: 'Última actualización hoy, 08:42' },
  { id: 'caixabank', name: 'CaixaBank', status: 'synced', detail: 'Última actualización hoy, 08:42' },
  { id: 'revolut', name: 'Revolut', status: 'syncing', detail: 'Sincronizando ahora…' },
  { id: 'ing', name: 'ING', status: 'synced', detail: 'Última actualización ayer, 21:10' },
  { id: 'myinvestor', name: 'MyInvestor', status: 'error', detail: 'No se pudo actualizar desde hace 3 días' },
  { id: 'bankinter', name: 'Bankinter', status: 'synced', detail: 'Última actualización hoy, 08:42' },
]

export interface CsvColumn {
  fileColumn: string
  field: 'fecha' | 'concepto' | 'importe' | 'cuenta'
}

export const csvColumns: CsvColumn[] = [
  { fileColumn: 'Fecha_Op', field: 'fecha' },
  { fileColumn: 'Concepto', field: 'concepto' },
  { fileColumn: 'Importe_EUR', field: 'importe' },
  { fileColumn: 'Cuenta_Origen', field: 'cuenta' },
]

export const FIELD_LABELS: Record<CsvColumn['field'], string> = {
  fecha: 'Fecha',
  concepto: 'Comercio',
  importe: 'Importe',
  cuenta: 'Cuenta',
}

export const csvImportResult = {
  newRows: 42,
  duplicateRows: 6,
  rejectedRows: 2,
  rejectionReason: 'Las 2 filas rechazadas tienen un formato de fecha que no reconocemos.',
}

export const CURRENCY_OPTIONS = ['EUR (€)', 'USD ($)', 'GBP (£)']
export const DATE_FORMAT_OPTIONS = ['DD/MM/AAAA', 'MM/DD/AAAA', 'AAAA-MM-DD']
export const BUDGET_MONTH_START_OPTIONS = [1, 5, 15, 25]
