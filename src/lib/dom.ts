/**
 * Devuelve el foco a la fila que abrió un panel, identificada por `data-row-id`.
 * Cada tabla tiene una fila de escritorio y una tarjeta de móvil con el mismo
 * id (una de las dos oculta según el ancho); sin filtrar por visibilidad,
 * `focus()` puede caer en el elemento oculto y no hacer nada.
 */
export function focusRowById(id: string | null): void {
  if (!id) return
  const candidates = document.querySelectorAll<HTMLElement>(`[data-row-id="${id}"]`)
  const visible = [...candidates].find((el) => el.offsetParent !== null)
  visible?.focus()
}
