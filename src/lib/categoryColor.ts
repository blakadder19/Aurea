const CATEGORY_BG_CLASSES = [
  'bg-cat-1',
  'bg-cat-2',
  'bg-cat-3',
  'bg-cat-4',
  'bg-cat-5',
  'bg-cat-6',
  'bg-cat-7',
  'bg-cat-8',
] as const

/**
 * Color fijo y determinista por categoría (mismo nombre → mismo color
 * siempre, sin tabla que mantener — las categorías reales son libres, no
 * un catálogo cerrado). "Sin clasificar" siempre gris neutro.
 */
export function categoryColorClass(categoryName: string): string {
  if (categoryName === 'Sin clasificar') return 'bg-ink-faint'
  let hash = 0
  for (let i = 0; i < categoryName.length; i++) hash = (hash * 31 + categoryName.charCodeAt(i)) >>> 0
  return CATEGORY_BG_CLASSES[hash % CATEGORY_BG_CLASSES.length]
}
