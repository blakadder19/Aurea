import { lazy, type ComponentType } from 'react'

const RELOADED_KEY = 'aurea:chunk-reloaded'

/**
 * Marca que ya se ha recargado por un trozo de código que faltaba, para no
 * entrar en bucle si el fallo no era un despliegue sino falta de red.
 * En sessionStorage: se olvida al cerrar la pestaña, que es justo lo que
 * queremos — cada sesión tiene derecho a un reintento.
 */
function alreadyReloaded(): boolean {
  try {
    return sessionStorage.getItem(RELOADED_KEY) === '1'
  } catch {
    return false // Safari en privado tira al leer sessionStorage: mejor reintentar que romper.
  }
}

function rememberReload(): void {
  try {
    sessionStorage.setItem(RELOADED_KEY, '1')
  } catch {
    // Sin sessionStorage no hay protección contra bucle, pero recargar una
    // vez sigue siendo mejor que dejar la pantalla en blanco.
  }
}

/** Se llama al cargar bien un trozo: el despliegue ya está al día. */
function clearReloadMark(): void {
  try {
    sessionStorage.removeItem(RELOADED_KEY)
  } catch {
    // Da igual: solo era una marca para evitar bucles.
  }
}

/**
 * `lazy()` que sobrevive a un despliegue con la app abierta.
 *
 * Vite pone un hash en el nombre de cada trozo de código. Si despliegas
 * mientras alguien tiene la app abierta, su index.js ya cargado pide un
 * trozo con el hash viejo, que en el servidor ya no existe: el import
 * falla y React deja la pantalla en blanco, sin explicación.
 *
 * Aquí se recarga la página una sola vez, que es lo que arregla el caso
 * real (traerse el index nuevo). Si tras recargar vuelve a fallar, es otra
 * cosa (sin red, por ejemplo) y se deja pasar el error para no dar vueltas.
 */
export function lazyRoute<T extends ComponentType<unknown>>(factory: () => Promise<{ default: T }>) {
  return lazy(() =>
    factory()
      .then((mod) => {
        clearReloadMark()
        return mod
      })
      .catch((error: unknown) => {
        if (alreadyReloaded()) throw error
        rememberReload()
        window.location.reload()
        // La página se está recargando: esta promesa no debe resolver nunca,
        // o React pintaría un error justo antes de que desaparezca todo.
        return new Promise<{ default: T }>(() => {})
      }),
  )
}
