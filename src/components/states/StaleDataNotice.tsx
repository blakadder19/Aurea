interface StaleDataNoticeProps {
  /** "hace 3 días" */
  ageLabel: string
  body: string
  onReconnect: () => void
}

/** Aviso ámbar de datos desactualizados: antigüedad en texto + Reconectar. */
export function StaleDataNotice({ ageLabel, body, onReconnect }: StaleDataNoticeProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
      <div className="inline-flex w-fit items-center gap-2 rounded-md border border-warning-line bg-warning-bg px-3 py-2 text-sm font-semibold text-warning-text">
        <span aria-hidden="true">⏱</span> Última actualización {ageLabel}
      </div>
      <p className="text-base text-ink text-pretty">{body}</p>
      <button
        type="button"
        onClick={onReconnect}
        className="min-h-11 self-start rounded-md border border-line bg-surface px-[18px] text-base font-semibold text-ink hover:bg-canvas"
      >
        Reconectar ahora
      </button>
    </div>
  )
}
