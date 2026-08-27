import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `lazyRoute` envuelve el import en `lazy()`, que solo lo ejecuta al
 * renderizar. Para probar la lógica que importa —recargar una vez y no
 * entrar en bucle— se prueba el factory directamente a través del mock de
 * `lazy`, que aquí simplemente lo deja pasar.
 */
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return { ...actual, lazy: (factory: unknown) => factory }
})

const { lazyRoute } = await import('./lazyRoute')

function runFactory(fn: () => Promise<unknown>) {
  return (lazyRoute(fn as never) as unknown as () => Promise<unknown>)()
}

describe('lazyRoute', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.restoreAllMocks()
  })

  it('cuando el import va bien, devuelve el módulo sin tocar nada', async () => {
    const reload = vi.fn()
    vi.stubGlobal('location', { reload })
    const mod = { default: () => null }

    await expect(runFactory(() => Promise.resolve(mod))).resolves.toBe(mod)
    expect(reload).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('si falta el trozo de código (despliegue con la app abierta), recarga una vez', async () => {
    const reload = vi.fn()
    vi.stubGlobal('location', { reload })

    // No resuelve nunca a propósito: la página se está recargando.
    const pending = runFactory(() => Promise.reject(new Error('Failed to fetch dynamically imported module')))
    const settled = await Promise.race([pending.then(() => 'resolvió'), Promise.resolve('sigue pendiente')])

    expect(reload).toHaveBeenCalledTimes(1)
    expect(settled).toBe('sigue pendiente')
    vi.unstubAllGlobals()
  })

  it('si tras recargar vuelve a fallar, propaga el error en vez de recargar en bucle', async () => {
    const reload = vi.fn()
    vi.stubGlobal('location', { reload })
    sessionStorage.setItem('aurea:chunk-reloaded', '1')

    await expect(runFactory(() => Promise.reject(new Error('sin red')))).rejects.toThrow('sin red')
    expect(reload).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('un import correcto borra la marca, para que la siguiente sesión tenga su reintento', async () => {
    vi.stubGlobal('location', { reload: vi.fn() })
    sessionStorage.setItem('aurea:chunk-reloaded', '1')

    await runFactory(() => Promise.resolve({ default: () => null }))

    expect(sessionStorage.getItem('aurea:chunk-reloaded')).toBeNull()
    vi.unstubAllGlobals()
  })
})
