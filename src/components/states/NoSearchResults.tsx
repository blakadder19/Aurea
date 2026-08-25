interface NoSearchResultsProps {
  query: string
  onClearFilters: () => void
}

/** Sin resultados de búsqueda: dice qué se buscó y ofrece limpiar filtros. */
export function NoSearchResults({ query, onClearFilters }: NoSearchResultsProps) {
  return (
    <div className="flex flex-col items-center gap-3.5 rounded-card border border-line bg-surface p-7 text-center">
      <div className="h-16 w-16 rounded-full border border-dashed border-[#c4ccc8] bg-canvas" aria-hidden="true" />
      <div className="text-[19px] font-bold text-ink">Nada coincide con «{query}»</div>
      <p className="max-w-[34ch] text-base text-ink-muted text-pretty">
        Revisa la ortografía o prueba con un rango de fechas más amplio.
      </p>
      <button
        type="button"
        onClick={onClearFilters}
        className="min-h-11 rounded-md border border-brand bg-surface px-[18px] text-base font-semibold text-brand hover:bg-brand-soft"
      >
        Quitar filtros
      </button>
    </div>
  )
}
