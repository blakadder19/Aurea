import { useState } from 'react'
import { EmojiPicker } from '../../components/EmojiPicker'
import type { TransactionTag } from '../../data/transactions'
import { defaultTagColor, TAG_COLORS, tagBgClass } from '../../lib/tagColor'

export interface TagPickerProps {
  availableTags: TransactionTag[]
  /** Ids ya puestos: se enseñan marcados y pulsarlos los quita. */
  activeTagIds?: string[]
  onPick: (tag: TransactionTag) => void
  onCreate: (name: string, emoji: string | null, color: string) => Promise<{ error: string | null; tag: TransactionTag | null }>
  disabled?: boolean
}

/**
 * Elegir etiqueta de las que ya tienes, y crear una nueva solo si lo pides.
 *
 * Escribir filtra, nunca crea. Crear es un botón aparte con su nombre, su
 * emoji y su color: así es como se deja de tener "viaje", "Viaje" y
 * "viaje-china" como tres cosas distintas, que es lo que pasaba cuando las
 * etiquetas eran un campo de texto separado por comas.
 */
export function TagPicker({ availableTags, activeTagIds = [], onPick, onCreate, disabled = false }: TagPickerProps) {
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [emoji, setEmoji] = useState('')
  const [color, setColor] = useState<string>(defaultTagColor(''))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const trimmed = query.trim()
  const matches = trimmed
    ? availableTags.filter((t) => t.name.toLowerCase().includes(trimmed.toLowerCase()))
    : availableTags
  const exact = availableTags.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())

  function startCreating() {
    setColor(defaultTagColor(trimmed))
    setEmoji('')
    setError(null)
    setCreating(true)
  }

  async function handleCreate() {
    setSaving(true)
    setError(null)
    const { error: err, tag } = await onCreate(trimmed, emoji || null, color)
    setSaving(false)
    if (err || !tag) {
      setError(err ?? 'No hemos podido crear la etiqueta.')
      return
    }
    setCreating(false)
    setQuery('')
    onPick(tag)
  }

  return (
    <div className="flex w-[280px] flex-col gap-2 rounded-md border border-line bg-surface p-3 text-ink">
      <input
        autoFocus
        type="text"
        value={query}
        disabled={disabled || saving}
        onChange={(e) => {
          setQuery(e.target.value)
          setCreating(false)
        }}
        placeholder="Buscar etiqueta"
        aria-label="Buscar etiqueta"
        className="min-h-11 rounded-md border border-line px-3 py-2 text-[15px] text-ink"
      />

      {matches.length > 0 && (
        <div className="flex max-h-[180px] flex-wrap gap-1 overflow-y-auto">
          {matches.map((tag) => {
            const active = activeTagIds.includes(tag.id)
            return (
              <button
                key={tag.id}
                type="button"
                disabled={disabled || saving}
                aria-pressed={active}
                onClick={() => onPick(tag)}
                className={`rounded-full px-2.5 py-1 text-[13px] font-medium text-surface ${tagBgClass(tag.color)} ${
                  active ? 'ring-2 ring-ink ring-offset-1' : 'opacity-85 hover:opacity-100'
                }`}
              >
                {tag.emoji ? `${tag.emoji} ` : ''}
                {tag.name}
              </button>
            )
          })}
        </div>
      )}

      {trimmed !== '' && !exact && !creating && (
        <button
          type="button"
          disabled={disabled || saving}
          onClick={startCreating}
          className="min-h-11 rounded-md border border-brand px-3 py-2 text-[15px] font-semibold text-brand hover:bg-brand-soft"
        >
          Crear «{trimmed}»
        </button>
      )}

      {matches.length === 0 && trimmed === '' && <p className="text-sm text-ink-muted">Todavía no tienes etiquetas. Escribe una para crearla.</p>}

      {creating && (
        <div className="flex flex-col gap-2 border-t border-line pt-2">
          <div className="flex flex-col gap-1 text-sm font-semibold text-ink-muted">
            Emoji (opcional)
            <EmojiPicker value={emoji || null} disabled={saving} ariaLabel="Emoji de la etiqueta" onSelect={(e) => setEmoji(e ?? '')} />
          </div>
          <div className="flex flex-col gap-1 text-sm font-semibold text-ink-muted">
            Color
            <div className="flex flex-wrap gap-1.5">
              {TAG_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  disabled={saving}
                  aria-label={`Color ${c}`}
                  aria-pressed={color === c}
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full ${tagBgClass(c)} ${color === c ? 'ring-2 ring-ink ring-offset-1' : ''}`}
                />
              ))}
            </div>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleCreate()}
            className="min-h-11 rounded-md border border-brand bg-brand px-3 py-2 text-[15px] font-semibold text-surface hover:bg-brand-hover disabled:opacity-60"
          >
            Crear etiqueta
          </button>
        </div>
      )}

      {error && <p className="text-sm text-danger-text">{error}</p>}
    </div>
  )
}
