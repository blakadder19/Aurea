import { describe, expect, it } from 'vitest'
import { buildImportPreview, guessMapping, mapRows, parseAmountToCents, parseCsv, parseDateToIso } from './csvImport'

describe('parseCsv', () => {
  it('separa cabecera y filas por comas', () => {
    const { header, rows } = parseCsv('Fecha,Concepto,Importe\n25/08/2026,Mercadona,-15.70\n26/08/2026,Nomina,2000')
    expect(header).toEqual(['Fecha', 'Concepto', 'Importe'])
    expect(rows).toEqual([
      ['25/08/2026', 'Mercadona', '-15.70'],
      ['26/08/2026', 'Nomina', '2000'],
    ])
  })

  it('detecta el punto y coma como delimitador cuando predomina', () => {
    const { header, rows } = parseCsv('Fecha;Concepto;Importe\n25/08/2026;Mercadona;-15,70')
    expect(header).toEqual(['Fecha', 'Concepto', 'Importe'])
    expect(rows).toEqual([['25/08/2026', 'Mercadona', '-15,70']])
  })

  it('respeta comas dentro de campos entrecomillados', () => {
    const { rows } = parseCsv('Fecha,Concepto,Importe\n25/08/2026,"Restaurante, S.L.",-30')
    expect(rows).toEqual([['25/08/2026', 'Restaurante, S.L.', '-30']])
  })

  it('ignora líneas en blanco', () => {
    const { rows } = parseCsv('Fecha,Concepto,Importe\n25/08/2026,Mercadona,-15.70\n\n')
    expect(rows).toHaveLength(1)
  })
})

describe('guessMapping', () => {
  it('reconoce cabeceras habituales en español e inglés', () => {
    const mapping = guessMapping(['Fecha', 'Concepto', 'Importe', 'Observaciones'])
    expect(mapping).toEqual({ Fecha: 'fecha', Concepto: 'comercio', Importe: 'importe', Observaciones: 'nota' })
  })

  it('marca como "ignorar" las columnas que no reconoce', () => {
    const mapping = guessMapping(['Fecha', 'Saldo tras movimiento'])
    expect(mapping.Fecha).toBe('fecha')
    expect(mapping['Saldo tras movimiento']).toBe('ignorar')
  })
})

describe('parseAmountToCents', () => {
  it('interpreta formato europeo con miles y decimales', () => {
    expect(parseAmountToCents('1.234,56')).toBe(123456)
  })

  it('interpreta formato anglosajón con miles y decimales', () => {
    expect(parseAmountToCents('1,234.56')).toBe(123456)
  })

  it('interpreta coma como decimal cuando hay dos dígitos', () => {
    expect(parseAmountToCents('-15,70')).toBe(-1570)
  })

  it('interpreta punto como decimal cuando hay dos dígitos', () => {
    expect(parseAmountToCents('-15.70')).toBe(-1570)
  })

  it('interpreta un entero sin decimales', () => {
    expect(parseAmountToCents('150')).toBe(15000)
  })

  it('interpreta paréntesis como negativo', () => {
    expect(parseAmountToCents('(15,70)')).toBe(-1570)
  })

  it('ignora símbolos de divisa', () => {
    expect(parseAmountToCents('€ 15,70')).toBe(1570)
  })

  it('devuelve null si no hay dígitos', () => {
    expect(parseAmountToCents('n/a')).toBeNull()
  })
})

describe('parseDateToIso', () => {
  it('acepta AAAA-MM-DD', () => {
    expect(parseDateToIso('2026-08-25')).toBe('2026-08-25')
  })

  it('acepta DD/MM/AAAA', () => {
    expect(parseDateToIso('25/08/2026')).toBe('2026-08-25')
  })

  it('acepta DD-MM-AAAA', () => {
    expect(parseDateToIso('05-01-2026')).toBe('2026-01-05')
  })

  it('rechaza un formato irreconocible', () => {
    expect(parseDateToIso('ayer')).toBeNull()
  })
})

describe('mapRows + buildImportPreview', () => {
  const header = ['Fecha', 'Concepto', 'Importe']
  const mapping = guessMapping(header)

  it('marca como válida una fila bien formada y sin duplicar', () => {
    const rows = mapRows([['25/08/2026', 'Mercadona', '-15,70']], header, mapping)
    const preview = buildImportPreview(rows, new Set())
    expect(preview[0]).toMatchObject({ rejectionReason: null, isDuplicate: false })
  })

  it('rechaza una fila con fecha irreconocible', () => {
    const rows = mapRows([['ayer', 'Mercadona', '-15,70']], header, mapping)
    const preview = buildImportPreview(rows, new Set())
    expect(preview[0].rejectionReason).toBe('Fecha no reconocida')
  })

  it('rechaza una fila con importe irreconocible', () => {
    const rows = mapRows([['25/08/2026', 'Mercadona', 'n/a']], header, mapping)
    const preview = buildImportPreview(rows, new Set())
    expect(preview[0].rejectionReason).toBe('Importe no reconocido')
  })

  it('marca como duplicado un movimiento ya existente en la cuenta', () => {
    const rows = mapRows([['25/08/2026', 'Mercadona', '-15,70']], header, mapping)
    const preview = buildImportPreview(rows, new Set(['2026-08-25|-1570|mercadona']))
    expect(preview[0].isDuplicate).toBe(true)
  })

  it('marca como duplicada la segunda de dos filas idénticas en el mismo archivo', () => {
    const rows = mapRows(
      [
        ['25/08/2026', 'Mercadona', '-15,70'],
        ['25/08/2026', 'Mercadona', '-15,70'],
      ],
      header,
      mapping,
    )
    const preview = buildImportPreview(rows, new Set())
    expect(preview[0].isDuplicate).toBe(false)
    expect(preview[1].isDuplicate).toBe(true)
  })
})
