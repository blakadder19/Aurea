import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CategoriesCard } from './CategoriesCard'
import type { RealCategory } from '../transactions/useRealCategories'
import { updateCategoryIcon } from '../transactions/useRealCategories'

vi.mock('../transactions/useRealCategories', async () => {
  const actual = await vi.importActual<typeof import('../transactions/useRealCategories')>('../transactions/useRealCategories')
  return { ...actual, updateCategoryIcon: vi.fn().mockResolvedValue(null), deleteCategory: vi.fn().mockResolvedValue(null) }
})

function cat(overrides: Partial<RealCategory> & { id: string; name: string }): RealCategory {
  return { icon: null, categoryGroup: 'alimentacion', parentId: null, ...overrides }
}

const categories: RealCategory[] = [
  cat({ id: 'restaurantes', name: 'Restaurantes' }),
  cat({ id: 'delivery', name: 'Delivery', parentId: 'restaurantes' }),
  cat({ id: 'super', name: 'Supermercado' }),
]

describe('CategoriesCard', () => {
  it('el icono de una categoría se elige de un selector y se guarda al elegirlo', async () => {
    const onRefetch = vi.fn()
    render(<CategoriesCard categories={categories} onRefetch={onRefetch} />)

    // Antes era un campo de texto que guardaba al salir de él: si cerrabas
    // pulsando fuera, el cambio se perdía.
    fireEvent.click(screen.getByRole('button', { name: /^Icono de Supermercado/ }))
    fireEvent.change(screen.getByLabelText('Buscar emoji'), { target: { value: 'carrito' } })
    fireEvent.click(screen.getByRole('button', { name: 'compra' }))

    await waitFor(() => expect(updateCategoryIcon).toHaveBeenCalledWith('super', '🛒'))
  })

  it('coloca cada subcategoría justo detrás de su madre, no en orden alfabético', () => {
    render(<CategoriesCard categories={categories} onRefetch={vi.fn()} />)
    const names = screen
      .getAllByRole('button', { name: /^Icono de / })
      .map((i) => i.getAttribute('aria-label') ?? '')
      // El del alta no es una fila de la lista, y el de una categoría que ya
      // tiene icono lleva ", ahora 🛒" detrás.
      .map((label) => label.replace(/, ahora .*$/, ''))
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
