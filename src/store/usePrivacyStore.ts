import { create } from 'zustand'

const STORAGE_KEY = 'aurea:privacy-hidden'

function readInitial(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

interface PrivacyState {
  /** Oculta todas las cifras de dinero de la app tras un antifaz, en toda pestaña/recarga. */
  hidden: boolean
  toggle: () => void
}

/** Modo privacidad: un único interruptor global que Money.tsx respeta en cada cifra. */
export const usePrivacyStore = create<PrivacyState>((set) => ({
  hidden: readInitial(),
  toggle: () =>
    set((state) => {
      const next = !state.hidden
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      } catch {
        // localStorage no disponible (p. ej. modo privado agresivo): el toggle sigue funcionando en memoria.
      }
      return { hidden: next }
    }),
}))
