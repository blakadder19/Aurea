import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EmojiPicker } from './EmojiPicker'
import { searchEmojis } from '../lib/emojiCatalog'

describe('searchEmojis', () => {
  it('sin consulta devuelve todos los grupos', () => {
    expect(searchEmojis('').length).toBeGreaterThan(3)
  })

  it('busca sin tildes, para que "avion" encuentre ✈️', () => {
    const encontrados = searchEmojis('avion').flatMap((g) => g.emojis.map((e) => e.char))
    expect(encontrados).toContain('✈️')
  })

  it('busca también por el nombre del grupo', () => {
    const encontrados = searchEmojis('banderas').flatMap((g) => g.emojis.map((e) => e.char))
    expect(encontrados).toContain('🇨🇳')
  })

  it('sin coincidencias devuelve vacío en vez de todo', () => {
    expect(searchEmojis('xyzqwerty')).toEqual([])
  })
})

describe('EmojiPicker', () => {
  it('empieza cerrado y se abre al pulsar', () => {
    render(<EmojiPicker value={null} ariaLabel="Emoji de la etiqueta" onSelect={vi.fn()} />)
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Emoji de la etiqueta' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('buscar y elegir devuelve el emoji y cierra', () => {
    const onSelect = vi.fn()
    render(<EmojiPicker value={null} ariaLabel="Emoji de la etiqueta" onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('button', { name: 'Emoji de la etiqueta' }))
    fireEvent.change(screen.getByLabelText('Buscar emoji'), { target: { value: 'china' } })
    fireEvent.click(screen.getByRole('button', { name: 'china' }))

    expect(onSelect).toHaveBeenCalledWith('🇨🇳')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('la lista curada no lo tiene todo: se puede pegar otro', () => {
    const onSelect = vi.fn()
    render(<EmojiPicker value={null} ariaLabel="Emoji de la etiqueta" onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('button', { name: 'Emoji de la etiqueta' }))
    fireEvent.change(screen.getByLabelText('Pegar otro emoji'), { target: { value: '🦄' } })
    fireEvent.click(screen.getByRole('button', { name: 'Usar' }))

    expect(onSelect).toHaveBeenCalledWith('🦄')
  })

  it('se puede quitar el que había', () => {
    const onSelect = vi.fn()
    render(<EmojiPicker value="🍕" ariaLabel="Emoji de la etiqueta" onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('button', { name: 'Emoji de la etiqueta, ahora 🍕' }))
    fireEvent.click(screen.getByRole('button', { name: 'Quitar' }))

    expect(onSelect).toHaveBeenCalledWith(null)
  })

  it('sin nada elegido no ofrece quitar', () => {
    render(<EmojiPicker value={null} ariaLabel="Emoji de la etiqueta" onSelect={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Emoji de la etiqueta' }))
    expect(screen.queryByRole('button', { name: 'Quitar' })).toBeNull()
  })

  it('Escape lo cierra sin elegir nada', () => {
    const onSelect = vi.fn()
    render(<EmojiPicker value={null} ariaLabel="Emoji de la etiqueta" onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('button', { name: 'Emoji de la etiqueta' }))
    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onSelect).not.toHaveBeenCalled()
  })
})
