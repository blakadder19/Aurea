/**
 * Colores de etiqueta. Las etiquetas eligen ranura de la paleta en vez de un
 * hex libre: así se ven como el resto de la app y siguen funcionando si algún
 * día cambia el tema.
 *
 * Las clases van escritas enteras y no compuestas (`bg-${color}`) porque
 * Tailwind solo conserva las que encuentra literales en el código.
 */

export const TAG_COLORS = ['cat-1', 'cat-2', 'cat-3', 'cat-4', 'cat-5', 'cat-6', 'cat-7', 'cat-8'] as const

export type TagColor = (typeof TAG_COLORS)[number]

const BG: Record<string, string> = {
  'cat-1': 'bg-cat-1',
  'cat-2': 'bg-cat-2',
  'cat-3': 'bg-cat-3',
  'cat-4': 'bg-cat-4',
  'cat-5': 'bg-cat-5',
  'cat-6': 'bg-cat-6',
  'cat-7': 'bg-cat-7',
  'cat-8': 'bg-cat-8',
}

/** Fondo de la etiqueta. Si el color no se reconoce, gris neutro antes que romper. */
export function tagBgClass(color: string): string {
  return BG[color] ?? 'bg-ink-faint'
}

/** Color de partida al crear una etiqueta: estable por nombre, para no dar siempre el mismo. */
export function defaultTagColor(name: string): TagColor {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return TAG_COLORS[hash % TAG_COLORS.length]
}
