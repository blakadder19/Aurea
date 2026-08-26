import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GoalCard } from './GoalCard'
import type { Goal } from '../../data/goals'

function goal(overrides: Partial<Goal>): Goal {
  return {
    id: 'g1',
    name: 'Viaje a Japón',
    saved: 2000,
    target: 4000,
    monthlyContribution: 200,
    status: 'success',
    statusLabel: 'Al día',
    note: 'aportando 200 €/mes',
    ...overrides,
  }
}

describe('GoalCard', () => {
  it('sin icono ni color, se ve igual que antes (sin insignias por debajo del 25%)', () => {
    render(<GoalCard goal={goal({ saved: 500 })} />)
    expect(screen.queryByText('🏆')).not.toBeInTheDocument()
    expect(screen.queryByText('⭐')).not.toBeInTheDocument()
  })

  it('con icono, lo antepone al nombre', () => {
    render(<GoalCard goal={goal({ icon: '🗾' })} />)
    const heading = screen.getByRole('heading', { name: 'Viaje a Japón' })
    expect(heading).toHaveTextContent('🗾 Viaje a Japón')
  })

  it('al superar cada hito de 25/50/75/100%, muestra una insignia por hito alcanzado', () => {
    render(<GoalCard goal={goal({ saved: 4000, target: 4000 })} />)
    expect(screen.getAllByText('⭐')).toHaveLength(3) // 25/50/75
    expect(screen.getByText('🏆')).toBeInTheDocument() // 100
  })
})
