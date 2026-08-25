import { useState } from 'react'
import { Badge } from '../../components/Badge'
import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import { useTransactionsStore } from './store'
import { displayLabelFor } from './TransactionsTable'
import { suggestCategories } from './useAiCategorization'
import { categoryLabel, type RealCategory } from './useRealCategories'
import type { RealTransaction } from './useRealTransactions'

interface RealReviewCenterProps {
  transactions: RealTransaction[]
  categories: RealCategory[]
  onSaveCategory: (id: string, categoryId: string) => Promise<string | null>
}

/**
 * Centro de revisión real: a diferencia de la demo, no inventamos
 * confianza ni explicaciones de un modelo — "Sugerencia IA" es una
 * sugerencia real de la API de Anthropic sobre tus propias categorías,
 * que tú aceptas o descartas; nunca se aplica sola.
 */
export function RealReviewCenter({ transactions, categories, onSaveCategory }: RealReviewCenterProps) {
  const openPanel = useTransactionsStore((s) => s.openPanel)
  const pending = transactions.filter((t) => !t.categoryId || t.needsReview)
  const categoryById = new Map(categories.map((c) => [c.id, categoryLabel(c)]))

  const [suggestions, setSuggestions] = useState<Record<string, string>>({})
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [suggestError, setSuggestError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [acceptingAll, setAcceptingAll] = useState(false)
  const [acceptAllError, setAcceptAllError] = useState<string | null>(null)

  const suggestionCount = Object.keys(suggestions).length

  async function handleSuggest() {
    setLoadingSuggestions(true)
    setSuggestError(null)
    const { suggestions: result, error } = await suggestCategories()
    setLoadingSuggestions(false)
    if (error) {
      setSuggestError(error)
      return
    }
    setSuggestions(Object.fromEntries(result.map((s) => [s.transactionId, s.categoryId])))
  }

  async function handleAccept(transactionId: string, categoryId: string) {
    setSavingId(transactionId)
    const error = await onSaveCategory(transactionId, categoryId)
    setSavingId(null)
    if (!error) handleDismiss(transactionId)
  }

  function handleDismiss(transactionId: string) {
    setSuggestions((prev) => {
      const next = { ...prev }
      delete next[transactionId]
      return next
    })
  }

  async function handleAcceptAll() {
    const entries = Object.entries(suggestions)
    if (entries.length === 0) return
    setAcceptingAll(true)
    setAcceptAllError(null)
    const results = await Promise.all(
      entries.map(([transactionId, categoryId]) => onSaveCategory(transactionId, categoryId).then((error) => ({ transactionId, error }))),
    )
    setAcceptingAll(false)
    const failedIds = new Set(results.filter((r) => r.error).map((r) => r.transactionId))
    if (failedIds.size > 0) {
      setAcceptAllError(`No hemos podido guardar ${failedIds.size} de ${entries.length} sugerencias. Las demás sí se guardaron — inténtalo de nuevo con las que quedan.`)
    }
    setSuggestions((prev) => {
      const next = { ...prev }
      for (const [transactionId] of entries) {
        if (!failedIds.has(transactionId)) delete next[transactionId]
      }
      return next
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base text-ink-muted">
          {pending.length === 0
            ? 'No queda nada por revisar.'
            : `${pending.length} movimiento${pending.length === 1 ? '' : 's'} sin categorizar.`}
        </p>
        {pending.length > 0 && categories.length > 0 && (
          <div className="flex flex-wrap gap-2.5">
            {suggestionCount > 0 && (
              <button
                type="button"
                onClick={() => void handleAcceptAll()}
                disabled={acceptingAll}
                className="min-h-11 rounded-md border border-brand bg-brand px-4 py-2.5 text-base font-semibold text-surface hover:bg-brand-hover disabled:opacity-60"
              >
                {acceptingAll ? 'Guardando…' : `Aceptar todas (${suggestionCount})`}
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleSuggest()}
              disabled={loadingSuggestions}
              className="min-h-11 rounded-md border border-brand bg-surface px-4 py-2.5 text-base font-semibold text-brand hover:bg-brand-soft disabled:opacity-60"
            >
              {loadingSuggestions ? 'Pensando…' : 'Sugerir categorías con IA'}
            </button>
          </div>
        )}
      </div>
      {suggestError && <p className="text-sm text-danger-text">{suggestError}</p>}
      {acceptAllError && <p className="text-sm text-danger-text">{acceptAllError}</p>}

      {pending.length === 0 ? (
        <Card padding="lg" className="py-12 text-center">
          <p className="text-base text-ink-muted">No queda nada por revisar.</p>
        </Card>
      ) : (
        pending.map((t) => {
          const suggestedCategoryId = suggestions[t.id]
          const suggestedName = suggestedCategoryId ? categoryById.get(suggestedCategoryId) : undefined
          return (
            <Card key={t.id} className="flex flex-col gap-3.5" padding="lg">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[17px] font-bold text-ink">{displayLabelFor(t)}</div>
                  <div className="mt-1 text-[15px] text-ink-muted">
                    {t.fecha} · {t.cuenta}
                  </div>
                </div>
                <Money value={t.importe} signed={t.importe > 0} tone={t.importe > 0 ? 'green' : 'ink'} className="text-[17px] font-bold" />
              </div>
              {suggestedName && (
                <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-plum-line bg-plum-bg p-3">
                  <Badge variant="plum" icon="">
                    Sugerencia IA
                  </Badge>
                  <span className="text-[15px] font-semibold text-ink">{suggestedName}</span>
                  <div className="ml-auto flex gap-2">
                    <button
                      type="button"
                      disabled={savingId === t.id}
                      onClick={() => void handleAccept(t.id, suggestedCategoryId)}
                      className="min-h-9 rounded-md border border-brand bg-brand px-3 text-[15px] font-semibold text-surface hover:bg-brand-hover disabled:opacity-60"
                    >
                      Aceptar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDismiss(t.id)}
                      className="min-h-9 rounded-md border border-line bg-surface px-3 text-[15px] font-semibold text-ink hover:bg-canvas"
                    >
                      Descartar
                    </button>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => openPanel(t.id)}
                className="min-h-11 w-fit rounded-md border border-brand bg-brand px-4 py-2.5 text-base font-semibold text-surface hover:bg-brand-hover"
              >
                Categorizar
              </button>
            </Card>
          )
        })
      )}
    </div>
  )
}
