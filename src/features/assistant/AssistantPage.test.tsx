import { fireEvent, render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { AssistantPage } from './AssistantPage'
import { useAssistantStore } from './store'

function renderPage() {
  return render(
    <BrowserRouter>
      <AssistantPage />
    </BrowserRouter>,
  )
}

function resetStore() {
  useAssistantStore.setState({ selectedId: null, freeformSubmitted: false })
}

describe('AssistantPage', () => {
  afterEach(resetStore)

  it('las cuatro preguntas sugeridas se muestran como botones con el texto completo', () => {
    renderPage()
    expect(screen.getByRole('button', { name: '¿Puedo permitirme un viaje de 1.200 €?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '¿En qué se me va más dinero que el mes pasado?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '¿Cuándo llego a los 6 meses de colchón?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '¿Me conviene amortizar el coche?' })).toBeInTheDocument()
  })

  it('la respuesta del viaje calcula el disponible hoy y lleva badge, enlace y acción', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: '¿Puedo permitirme un viaje de 1.200 €?' }))
    expect(screen.getByText('Hecho')).toBeInTheDocument()
    expect(screen.getByText('Sí, con 4.183,24 € libres después')).toBeInTheDocument()
    expect(screen.getByText(/Cálculo: 5\.383,24 €/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver el desglose en Inicio' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Siguiente: ajustar el presupuesto del mes' })).toHaveAttribute(
      'href',
      '/presupuesto',
    )
  })

  it('la respuesta del colchón cuadra con Objetivos: 7 meses desde el 19 ago 2026', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: '¿Cuándo llego a los 6 meses de colchón?' }))
    expect(screen.getByText(/7 meses desde el 19 ago 2026/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver el fondo de emergencia en Objetivos' })).toHaveAttribute(
      'href',
      '/objetivos',
    )
  })

  it('el campo libre declara sus límites en vez de fingir una respuesta abierta', () => {
    renderPage()
    expect(
      screen.queryByText(/el asistente solo responde a las cuatro preguntas sugeridas/),
    ).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Escribe tu pregunta'), { target: { value: '¿Cuánto gasté en Netflix?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Preguntar' }))
    expect(screen.getByText(/el asistente solo responde a las cuatro preguntas sugeridas/)).toBeInTheDocument()
  })
})
