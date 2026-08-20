import { fireEvent, render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { HomePage } from './HomePage'

function renderHomePage() {
  return render(
    <BrowserRouter>
      <HomePage />
    </BrowserRouter>,
  )
}

describe('HomePage', () => {
  it('renders the Inicio heading and the hero figure once the loading skeleton resolves', async () => {
    renderHomePage()
    expect(screen.getByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
    expect(await screen.findByText('5.383,24 €')).toBeInTheDocument()
  })

  it('switches to Detalle mode and shows the extra breakdown', () => {
    renderHomePage()
    fireEvent.click(screen.getByRole('button', { name: 'Detalle' }))
    expect(screen.getByText('Dónde se va el presupuesto de agosto')).toBeInTheDocument()
  })
})
