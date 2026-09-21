import { useEffect, useRef, useState } from 'react'
import { searchEmojis } from '../lib/emojiCatalog'

interface EmojiPickerProps {
  value: string | null
  onSelect: (emoji: string | null) => void
  disabled?: boolean
  /** Frase completa para lectores de pantalla, p. ej. "Icono de Restaurantes". */
  ariaLabel: string
}

/**
 * Elegir un emoji pulsando, no escribiéndolo.
 *
 * El catálogo es propio y no una librería: `emoji-picker-react` y `emoji-mart`
 * pesan entre 500 kB y más de 1 MB, cuando la app entera ronda los 254 kB, y
 * además traen su propio aspecto. Ver `lib/emojiCatalog.ts`.
 *
 * Como la lista curada no es exhaustiva, abajo se puede pegar cualquier otro:
 * lo común se elige en dos clics y el resto sigue siendo posible.
 */
export function EmojiPicker({ value, onSelect, disabled = false, ariaLabel }: EmojiPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [pasted, setPasted] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function choose(emoji: string | null) {
    onSelect(emoji)
    setOpen(false)
    setQuery('')
    setPasted('')
  }

  const groups = searchEmojis(query)

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={value ? `${ariaLabel}, ahora ${value}` : ariaLabel}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-11 items-center justify-center rounded-md border border-line bg-surface text-xl hover:bg-canvas disabled:opacity-60"
      >
        {value || <span className="text-sm font-semibold text-ink-muted">＋</span>}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={ariaLabel}
          className="absolute top-12 left-0 z-50 flex w-[292px] flex-col gap-2 rounded-md border border-line bg-surface p-3 shadow-[0_10px_28px_rgba(22,26,25,0.18)]"
        >
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar: viaje, cafe, casa…"
            aria-label="Buscar emoji"
            className="min-h-11 rounded-md border border-line px-3 py-2 text-[15px] text-ink"
          />

          <div className="flex max-h-[220px] flex-col gap-2 overflow-y-auto">
            {groups.map((group) => (
              <div key={group.label} className="flex flex-col gap-1">
                <span className="text-[12px] font-semibold tracking-[0.06em] text-ink-muted uppercase">{group.label}</span>
                <div className="flex flex-wrap gap-1">
                  {group.emojis.map((e) => (
                    <button
                      key={e.char}
                      type="button"
                      aria-label={e.keywords.split(' ')[0]}
                      onClick={() => choose(e.char)}
                      className={`flex h-9 w-9 items-center justify-center rounded-md text-lg hover:bg-canvas ${
                        value === e.char ? 'bg-brand-soft ring-2 ring-brand' : ''
                      }`}
                    >
                      {e.char}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {groups.length === 0 && <p className="text-sm text-ink-muted">Ninguno con ese nombre. Puedes pegar el tuyo abajo.</p>}
          </div>

          {/* La lista curada no lo tiene todo: el resto se pega a mano. */}
          <div className="flex items-center gap-2 border-t border-line pt-2">
            <input
              type="text"
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder="o pega otro"
              aria-label="Pegar otro emoji"
              className="min-h-11 w-24 rounded-md border border-line px-3 py-2 text-[15px] text-ink"
            />
            <button
              type="button"
              disabled={pasted.trim() === ''}
              onClick={() => choose(pasted.trim())}
              className="min-h-11 rounded-md border border-line px-3 py-2 text-[15px] font-semibold text-ink disabled:opacity-40"
            >
              Usar
            </button>
            {value && (
              <button type="button" onClick={() => choose(null)} className="ml-auto min-h-11 px-2 text-[15px] font-semibold text-danger-text">
                Quitar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
