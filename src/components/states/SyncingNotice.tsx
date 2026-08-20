interface SyncingNoticeProps {
  accountLabel: string
  body: string
}

/** Sincronización en curso: indicador azul acero, no bloquea el resto de la pantalla. */
export function SyncingNotice({ accountLabel, body }: SyncingNoticeProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
      <div className="inline-flex w-fit items-center gap-2.5 rounded-md border border-info-line bg-info-bg px-3 py-2 text-sm font-semibold text-info">
        <span
          className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-info border-t-transparent"
          aria-hidden="true"
        />
        Sincronizando {accountLabel}…
      </div>
      <p className="text-base text-ink text-pretty">{body}</p>
    </div>
  )
}
