import { describe, expect, it } from 'vitest'
import { categoryColorClass } from './categoryColor'

describe('categoryColorClass', () => {
  it('el mismo nombre siempre da el mismo color', () => {
    expect(categoryColorClass('Restaurantes')).toBe(categoryColorClass('Restaurantes'))
  })

  it('"Sin clasificar" siempre es gris neutro', () => {
    expect(categoryColorClass('Sin clasificar')).toBe('bg-ink-faint')
  })

  it('devuelve una de las ocho clases de categoría para un nombre cualquiera', () => {
    const cls = categoryColorClass('Supermercado')
    expect(cls).toMatch(/^bg-cat-[1-8]$/)
  })
})
