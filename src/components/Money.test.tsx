import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Money } from './Money'
import { usePrivacyStore } from '../store/usePrivacyStore'

describe('Money', () => {
  afterEach(() => usePrivacyStore.setState({ hidden: false }))

  it('formatea en euros por defecto', () => {
    render(<Money value={1234.5} />)
    expect(screen.getByText('1.234,50 €')).toBeInTheDocument()
  })

  it('con modo privacidad activo, oculta la cifra tras un antifaz de ancho fijo', () => {
    usePrivacyStore.setState({ hidden: true })
    render(<Money value={1234.5} />)
    expect(screen.queryByText('1.234,50 €')).not.toBeInTheDocument()
    expect(screen.getByText('•••• €')).toBeInTheDocument()
  })

  it('el antifaz no varía con el valor: mismo ancho para una cifra grande y una pequeña', () => {
    usePrivacyStore.setState({ hidden: true })
    const { rerender } = render(<Money value={5} />)
    const small = screen.getByText('•••• €').textContent
    rerender(<Money value={9_999_999} />)
    const big = screen.getByText('•••• €').textContent
    expect(small).toBe(big)
  })
})
