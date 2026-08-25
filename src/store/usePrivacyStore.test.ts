import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { usePrivacyStore } from './usePrivacyStore'

describe('usePrivacyStore', () => {
  beforeEach(() => {
    window.localStorage.clear()
    usePrivacyStore.setState({ hidden: false })
  })
  afterEach(() => window.localStorage.clear())

  it('empieza visible por defecto', () => {
    expect(usePrivacyStore.getState().hidden).toBe(false)
  })

  it('toggle oculta y persiste en localStorage', () => {
    usePrivacyStore.getState().toggle()
    expect(usePrivacyStore.getState().hidden).toBe(true)
    expect(window.localStorage.getItem('aurea:privacy-hidden')).toBe('1')
  })

  it('toggle dos veces vuelve a mostrar y actualiza localStorage', () => {
    usePrivacyStore.getState().toggle()
    usePrivacyStore.getState().toggle()
    expect(usePrivacyStore.getState().hidden).toBe(false)
    expect(window.localStorage.getItem('aurea:privacy-hidden')).toBe('0')
  })
})
