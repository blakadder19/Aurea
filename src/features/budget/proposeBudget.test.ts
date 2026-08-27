import { describe, expect, it } from 'vitest'
import { proposeBudgetFromHistory } from './proposeBudget'

describe('proposeBudgetFromHistory', () => {
  it('sin histórico, no propone nada', () => {
    expect(proposeBudgetFromHistory([])).toEqual({})
  })

  it('propone la mediana redondeada a la decena de euros hacia arriba', () => {
    // Mediana de 30/50/40 = 40 € → 40 €, ya redondo.
    const proposal = proposeBudgetFromHistory([{ categoryId: 'cat-1', spentCentsByMonth: [3000, 5000, 4000] }])
    expect(proposal['cat-1']).toBe(4000)
  })

  it('redondea hacia arriba, nunca hacia abajo', () => {
    // Mediana 43,50 € → 50 €: un presupuesto por debajo de lo que gastas
    // nace ya incumplido.
    const proposal = proposeBudgetFromHistory([{ categoryId: 'cat-1', spentCentsByMonth: [4350] }])
    expect(proposal['cat-1']).toBe(5000)
  })

  it('usa la mediana y no la media, para que un mes raro no arrastre el presupuesto', () => {
    // Una mudanza de 2.000 € entre dos meses normales de 300 €.
    // Media = 866 € (irreal). Mediana = 300 €.
    const proposal = proposeBudgetFromHistory([{ categoryId: 'cat-1', spentCentsByMonth: [30000, 200000, 30000] }])
    expect(proposal['cat-1']).toBe(30000)
  })

  it('ignora los meses sin gasto en vez de contarlos como ceros que hunden la mediana', () => {
    // Si solo gastaste en un mes de tres, la referencia es ese mes.
    const proposal = proposeBudgetFromHistory([{ categoryId: 'cat-1', spentCentsByMonth: [0, 0, 8000] }])
    expect(proposal['cat-1']).toBe(8000)
  })

  it('deja fuera las categorías sin gasto en ningún mes', () => {
    const proposal = proposeBudgetFromHistory([
      { categoryId: 'usada', spentCentsByMonth: [5000] },
      { categoryId: 'nunca', spentCentsByMonth: [0, 0, 0] },
    ])
    expect(Object.keys(proposal)).toEqual(['usada'])
  })

  it('con un número par de meses, promedia los dos centrales', () => {
    // 20 y 40 → 30 €.
    const proposal = proposeBudgetFromHistory([{ categoryId: 'cat-1', spentCentsByMonth: [2000, 4000] }])
    expect(proposal['cat-1']).toBe(3000)
  })
})
