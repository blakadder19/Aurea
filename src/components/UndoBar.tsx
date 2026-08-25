interface UndoBarProps {
  message: string
  onUndo?: () => void
}

/** Banda de confirmación reutilizable para toda acción reversible. */
export function UndoBar({ message, onUndo }: UndoBarProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-line bg-surface px-6 py-4">
      <div className="text-base text-ink-muted">{message}</div>
      <button
        type="button"
        onClick={onUndo}
        className="min-h-11 rounded-md border border-brand px-[18px] py-2.5 text-base font-bold text-brand hover:bg-brand-soft"
      >
        Deshacer
      </button>
    </div>
  )
}
