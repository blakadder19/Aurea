import { describe, expect, it } from 'vitest'
import { buildCategoryTrend } from './categoryTrendCalc'

const monthLabels = ['jun 26', 'jul 26', 'ago 26']

describe('buildCategoryTrend', () => {
  it('sin movimientos, no hay filas', () => {
    expect(buildCategoryTrend(monthLabels, [])).toEqual({ monthLabels, rows: [] })
  })

  it('agrupa por categoría y coloca cada importe en el mes que le corresponde', () => {
    const { rows } = buildCategoryTrend(monthLabels, [
      { monthIndex: 0, categoryId: 'cat-1', name: 'Supermercado', spentCents: 3000 },
      { monthIndex: 1, categoryId: 'cat-1', name: 'Supermercado', spentCents: 5000 },
      { monthIndex: 2, categoryId: 'cat-1', name: 'Supermercado', spentCents: 4000 },
    ])
    expect(rows).toEqual([{ categoryId: 'cat-1', name: 'Supermercado', spentCentsByMonth: [3000, 5000, 4000], totalSpentCents: 12000 }])
  })

  it('suma varios movimientos del mismo mes y categoría en la misma celda', () => {
    const { rows } = buildCategoryTrend(monthLabels, [
      { monthIndex: 0, categoryId: 'cat-1', name: 'Supermercado', spentCents: 1000 },
      { monthIndex: 0, categoryId: 'cat-1', name: 'Supermercado', spentCents: 500 },
    ])
    expect(rows[0].spentCentsByMonth[0]).toBe(1500)
  })

  it('agrupa "Sin clasificar" (categoryId null) como una sola fila', () => {
    const { rows } = buildCategoryTrend(monthLabels, [
      { monthIndex: 0, categoryId: null, name: 'Sin clasificar', spentCents: 1000 },
      { monthIndex: 1, categoryId: null, name: 'Sin clasificar', spentCents: 2000 },
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0].categoryId).toBeNull()
    expect(rows[0].totalSpentCents).toBe(3000)
  })

  it('ordena de mayor a menor gasto total y recorta a las 6 categorías con más gasto', () => {
    const entries = Array.from({ length: 8 }, (_, i) => ({ monthIndex: 0, categoryId: `cat-${i}`, name: `Cat ${i}`, spentCents: 100 - i * 10 }))
    const { rows } = buildCategoryTrend(monthLabels, entries)
    expect(rows).toHaveLength(6)
    expect(rows[0].name).toBe('Cat 0')
    expect(rows.map((r) => r.name)).not.toContain('Cat 6')
    expect(rows.map((r) => r.name)).not.toContain('Cat 7')
  })

  it('descarta categorías con gasto total 0 (nunca las mostradas)', () => {
    const { rows } = buildCategoryTrend(monthLabels, [{ monthIndex: 0, categoryId: 'cat-1', name: 'Vacía', spentCents: 0 }])
    expect(rows).toEqual([])
  })
})
