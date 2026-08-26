import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import { FreeformQuestion } from './FreeformQuestion'
import { useAssistantStore } from './store'
import type { FinancialSnapshot } from './useRealAnswers'

vi.mock('./useFreeformAnswer', async () => {
  const actual = await vi.importActual<typeof import('./useFreeformAnswer')>('./useFreeformAnswer')
  return { ...actual, askFreeformQuestion: vi.fn() }
})

const { askFreeformQuestion } = await import('./useFreeformAnswer')
const { useAuthStore } = await import('../../lib/supabase/useAuth')

const snapshot: FinancialSnapshot = {
  todayIso: '2026-08-25',
  availableToday: -886.44,
  netWorth: 1806.27,
  assets: 1806.27,
  liabilities: 0,
  savingsRatePct: 14,
  budget: null,
  goals: [],
  debts: [],
}

const activeSession = { user: { id: 'user-1' } } as unknown as Session

describe('FreeformQuestion', () => {
  beforeEach(() => {
    useAssistantStore.setState({ freeformHistory: [], freeformSubmitted: false })
    useAuthStore.setState({ session: activeSession })
    vi.mocked(askFreeformQuestion).mockReset()
  })

  it('al preguntar dos veces, sigue mostrando la primera respuesta y manda el turno anterior como historial', async () => {
    vi.mocked(askFreeformQuestion).mockResolvedValueOnce({ answer: 'Primera respuesta.', error: null })
    render(<FreeformQuestion snapshot={snapshot} />)

    fireEvent.change(screen.getByLabelText('Escribe tu pregunta'), { target: { value: '¿Primera pregunta?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Preguntar' }))
    await waitFor(() => expect(screen.getByText('Primera respuesta.')).toBeInTheDocument())

    vi.mocked(askFreeformQuestion).mockResolvedValueOnce({ answer: 'Segunda respuesta.', error: null })
    fireEvent.change(screen.getByLabelText('Escribe tu pregunta'), { target: { value: '¿Segunda pregunta?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Preguntar' }))
    await waitFor(() => expect(screen.getByText('Segunda respuesta.')).toBeInTheDocument())

    expect(askFreeformQuestion).toHaveBeenLastCalledWith('¿Segunda pregunta?', snapshot, [
      { question: '¿Primera pregunta?', answer: 'Primera respuesta.' },
    ])
    expect(screen.getByText('Primera respuesta.')).toBeInTheDocument()
  })

  it('"Nueva conversación" borra el historial mostrado', async () => {
    vi.mocked(askFreeformQuestion).mockResolvedValueOnce({ answer: 'Una respuesta.', error: null })
    render(<FreeformQuestion snapshot={snapshot} />)

    fireEvent.change(screen.getByLabelText('Escribe tu pregunta'), { target: { value: '¿Una pregunta?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Preguntar' }))
    await waitFor(() => expect(screen.getByText('Una respuesta.')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Nueva conversación' }))
    expect(screen.queryByText('Una respuesta.')).not.toBeInTheDocument()
  })

  it('si la Edge Function falla, muestra el error sin perder el historial ya mostrado', async () => {
    vi.mocked(askFreeformQuestion).mockResolvedValueOnce({ answer: 'Una respuesta.', error: null })
    render(<FreeformQuestion snapshot={snapshot} />)

    fireEvent.change(screen.getByLabelText('Escribe tu pregunta'), { target: { value: '¿Una pregunta?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Preguntar' }))
    await waitFor(() => expect(screen.getByText('Una respuesta.')).toBeInTheDocument())

    vi.mocked(askFreeformQuestion).mockResolvedValueOnce({ answer: null, error: 'No hemos podido responder ahora mismo.' })
    fireEvent.change(screen.getByLabelText('Escribe tu pregunta'), { target: { value: '¿Otra pregunta?' } })
    fireEvent.click(screen.getByRole('button', { name: 'Preguntar' }))

    await waitFor(() => expect(screen.getByText('No hemos podido responder ahora mismo.')).toBeInTheDocument())
    expect(screen.getByText('Una respuesta.')).toBeInTheDocument()
  })
})
