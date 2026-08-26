import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NetWorthTrendChart } from './NetWorthTrendChart'
import type { NetWorthPoint } from './netWorthHistory'

const points: NetWorthPoint[] = [
  { dateISO: '2026-08-01', netWorth: 1000 },
  { dateISO: '2026-08-15', netWorth: 1200 },
  { dateISO: '2026-08-26', netWorth: 1300 },
]

describe('NetWorthTrendChart', () => {
  it('con menos de 2 puntos, no muestra nada (nada que graficar)', () => {
    const { container } = render(<NetWorthTrendChart points={[points[0]]} loading={false} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('al pulsar "Ampliar", abre el gráfico a tamaño completo con el mismo título', () => {
    render(<NetWorthTrendChart points={points} loading={false} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Ampliar' }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getAllByText('Evolución del patrimonio').length).toBeGreaterThan(1)
  })

  it('se puede cerrar el gráfico ampliado', () => {
    render(<NetWorthTrendChart points={points} loading={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
