import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/supabase/client', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(),
    },
  },
}))

const { useAuthStore } = await import('../../lib/supabase/useAuth')
const { LoginPage } = await import('./LoginPage')

function resetStore() {
  useAuthStore.setState({ session: null, loading: false, magicLinkSentTo: null, requestError: null })
}

describe('LoginPage', () => {
  afterEach(resetStore)

  it('enviar el formulario llama a sendMagicLink con el email escrito', () => {
    const sendMagicLink = vi.fn()
    useAuthStore.setState({ sendMagicLink })
    render(<LoginPage />)

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'marta@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviarme el enlace' }))

    expect(sendMagicLink).toHaveBeenCalledWith('marta@example.com')
  })

  it('tras enviar el enlace, muestra el email de confirmación en vez del formulario', () => {
    useAuthStore.setState({ magicLinkSentTo: 'marta@example.com' })
    render(<LoginPage />)

    expect(screen.getByText('marta@example.com')).toBeInTheDocument()
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
  })

  it('muestra el error de la petición si Supabase lo devuelve', () => {
    useAuthStore.setState({ requestError: 'Demasiados intentos, espera un momento.' })
    render(<LoginPage />)

    expect(screen.getByText('Demasiados intentos, espera un momento.')).toBeInTheDocument()
  })
})
