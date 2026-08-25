/**
 * Importación de movimientos desde un CSV exportado de un banco — puro, sin
 * React ni Supabase, para poder probarlo sin un archivo real. Solo pensado
 * para alimentar cuentas manuales: una cuenta sincronizada con un banco
 * conectado ya trae sus movimientos solos.
 */

export interface ParsedCsv {
  header: string[]
  rows: string[][]
}

/** Detecta si el archivo usa "," o ";" mirando cuál aparece más veces en la cabecera. */
function detectDelimiter(firstLine: string): string {
  const commas = (firstLine.match(/,/g) ?? []).length
  const semicolons = (firstLine.match(/;/g) ?? []).length
  return semicolons > commas ? ';' : ','
}

/** Parser CSV mínimo: comillas dobles, campos con comas/saltos de línea dentro, \r\n y \n. */
export function parseCsv(text: string): ParsedCsv {
  const delimiter = detectDelimiter(text.slice(0, text.indexOf('\n') + 1 || text.length))
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
      continue
    }
    if (c === '"') {
      inQuotes = true
    } else if (c === delimiter) {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      field = ''
      if (row.some((f) => f.trim() !== '')) rows.push(row)
      row = []
    } else {
      field += c
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    if (row.some((f) => f.trim() !== '')) rows.push(row)
  }

  const [header, ...dataRows] = rows
  return { header: (header ?? []).map((h) => h.trim()), rows: dataRows }
}

export type ImportField = 'fecha' | 'comercio' | 'importe' | 'nota' | 'ignorar'

const FIELD_HINTS: Record<Exclude<ImportField, 'ignorar'>, string[]> = {
  fecha: ['fecha', 'date', 'dia', 'día'],
  comercio: ['comercio', 'concepto', 'descripcion', 'descripción', 'description', 'beneficiario', 'payee', 'merchant'],
  importe: ['importe', 'amount', 'cantidad', 'valor', 'monto'],
  nota: ['nota', 'note', 'observaciones', 'referencia', 'reference'],
}

/** Adivina qué campo de Áurea corresponde a cada columna del archivo, por el nombre de la cabecera. */
export function guessMapping(header: string[]): Record<string, ImportField> {
  const mapping: Record<string, ImportField> = {}
  const used = new Set<ImportField>()
  for (const col of header) {
    const lower = col.toLowerCase()
    const match = (Object.entries(FIELD_HINTS) as [Exclude<ImportField, 'ignorar'>, string[]][]).find(
      ([field, hints]) => !used.has(field) && hints.some((h) => lower.includes(h)),
    )
    if (match) {
      mapping[col] = match[0]
      used.add(match[0])
    } else {
      mapping[col] = 'ignorar'
    }
  }
  return mapping
}

/**
 * Interpreta un importe en los formatos habituales de un export bancario:
 * "1.234,56" (europeo), "1,234.56" (anglosajón), "15.70" o "15,70" simples,
 * "150" sin decimales, "(15,70)" o "-15,70" para negativos, con o sin
 * símbolo de divisa. Si hay un único separador con dígitos ambiguos
 * alrededor (ni 1 ni 2 decimales claros) se asume que es un separador de
 * miles, no de decimales — es la interpretación más común en extractos.
 */
export function parseAmountToCents(raw: string): number | null {
  let s = raw.trim()
  if (s === '') return null
  let negative = false
  if (/^\(.*\)$/.test(s)) {
    negative = true
    s = s.slice(1, -1)
  }
  s = s.replace(/[^\d.,-]/g, '')
  if (s.startsWith('-')) {
    negative = true
    s = s.slice(1)
  }
  if (s === '') return null

  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  let normalized: string
  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) normalized = s.replace(/\./g, '').replace(',', '.')
    else normalized = s.replace(/,/g, '')
  } else if (lastComma !== -1) {
    const decimals = s.length - lastComma - 1
    normalized = decimals === 2 ? s.replace(',', '.') : s.replace(/,/g, '')
  } else if (lastDot !== -1) {
    const decimals = s.length - lastDot - 1
    normalized = decimals === 2 ? s : s.replace(/\./g, '')
  } else {
    normalized = s
  }

  const value = Number(normalized)
  if (!Number.isFinite(value)) return null
  const cents = Math.round(value * 100)
  return negative ? -cents : cents
}

/** Interpreta "AAAA-MM-DD", "AAAA/MM/DD", "DD/MM/AAAA" y "DD-MM-AAAA". Cualquier otra cosa se rechaza. */
export function parseDateToIso(raw: string): string | null {
  const s = raw.trim()
  const iso = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/)
  if (iso) {
    const [, y, m, d] = iso
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  const eu = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (eu) {
    const [, d, m, y] = eu
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return null
}

export interface MappedRow {
  dateIso: string | null
  description: string
  amountCents: number | null
  note: string
}

export function mapRows(rows: string[][], header: string[], mapping: Record<string, ImportField>): MappedRow[] {
  const indexByField: Partial<Record<ImportField, number>> = {}
  header.forEach((col, i) => {
    const field = mapping[col]
    if (field && field !== 'ignorar' && !(field in indexByField)) indexByField[field] = i
  })

  return rows.map((row) => ({
    dateIso: indexByField.fecha !== undefined ? parseDateToIso(row[indexByField.fecha] ?? '') : null,
    description: (indexByField.comercio !== undefined ? row[indexByField.comercio] : '')?.trim() ?? '',
    amountCents: indexByField.importe !== undefined ? parseAmountToCents(row[indexByField.importe] ?? '') : null,
    note: (indexByField.nota !== undefined ? row[indexByField.nota] : '')?.trim() ?? '',
  }))
}

export function dedupeKey(dateIso: string, amountCents: number, description: string): string {
  return `${dateIso}|${amountCents}|${description.trim().toLowerCase()}`
}

export interface ImportPreviewRow {
  mapped: MappedRow
  rejectionReason: string | null
  isDuplicate: boolean
}

/**
 * Marca cada fila como válida, rechazada (fecha/importe/descripción que no
 * se pudieron interpretar) o duplicada — contra lo que ya existe en la
 * cuenta destino y contra otras filas del propio archivo, para no dar de
 * alta el mismo movimiento dos veces si el CSV lo repite.
 */
export function buildImportPreview(mappedRows: MappedRow[], existingKeys: ReadonlySet<string>): ImportPreviewRow[] {
  const seenInBatch = new Set<string>()
  return mappedRows.map((mapped) => {
    if (!mapped.dateIso) return { mapped, rejectionReason: 'Fecha no reconocida', isDuplicate: false }
    if (mapped.amountCents === null) return { mapped, rejectionReason: 'Importe no reconocido', isDuplicate: false }
    if (!mapped.description) return { mapped, rejectionReason: 'Sin descripción', isDuplicate: false }

    const key = dedupeKey(mapped.dateIso, mapped.amountCents, mapped.description)
    const isDuplicate = existingKeys.has(key) || seenInBatch.has(key)
    seenInBatch.add(key)
    return { mapped, rejectionReason: null, isDuplicate }
  })
}
