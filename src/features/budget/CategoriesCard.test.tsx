import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CategoriesCard } from './CategoriesCard'
import type { RealCategory } from '../transactions/useRealCategories'

function cat(overrides: Partial<RealCategory> & { id: string; name: string }): RealCategory {
  return { icon: null, categoryGroup: 'alimentacion', parentId: null, ...overrides }
}

const categories: RealCategory[] = [
  cat({ id: 'restaurantes', name: 'Restaurantes' }),
  cat({ id: 'delivery', name: 'Delivery', parentId: 'restaurantes' }),
  cat({ id: 'super', name: 'Supermercado' }),
]

describe('CategoriesCard', () => {
  it('coloca cada subcategoría justo detrás de su madre, no en orden alfabético', () => {
    render(<CategoriesCard categories={categories} onRefetch={vi.fn()} />)
    const names = screen
      .getAllByRole('textbox', { name: /^Icono de / })
      .map((i) => i.getAttribute('aria-label'))
      .filter((label) => label !== 'Icono de la nueva categoría')
    expect(names).toEqual(['Icono de Restaurantes', 'Icono de Delivery', 'Icono de Supermercado'])
  })

  it('solo ofrece como madre las categorías de primer nivel (la BD rechaza un tercer nivel)', () => {
    render(<CategoriesCard categories={categories} onRefetch={vi.fn()} />)
    const parentSelect = screen.getByRole('combobox', { name: 'Categoría madre de la nueva categoría' })
    const options = within(parentSelect).getAllByRole('option').map((o) => o.textContent)
    expect(options).toEqual(['Categoría principal', 'Dentro de Restaurantes', 'Dentro de Supermercado'])
    expect(options.some((o) => o?.includes('Delivery'))).toBe(false)
  })

  it('al elegir madre, no pide grupo: la subcategoría hereda el de su madre', () => {
    render(<CategoriesCard categories={categories} onRefetch={vi.fn()} />)
    // Sin madre elegida, el selector de grupo está visible.
    expect(screen.getByRole('combobox', { name: 'Grupo de la nueva categoría' })).toBeInTheDocument()
  })
})
