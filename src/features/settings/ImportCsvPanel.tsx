import { Badge } from '../../components/Badge'
import { Card } from '../../components/Card'
import { FIELD_LABELS, csvColumns, csvImportResult } from '../../data/settings'
import type { Step } from './store'
import { useSettingsStore } from './store'

const STEP_LABELS: Record<Step, string> = { 1: 'Mapear columnas', 2: 'Previsualizar', 3: 'Confirmar' }

function StepIndicator() {
  const step = useSettingsStore((s) => s.step)
  const maxStepReached = useSettingsStore((s) => s.maxStepReached)
  const goToStep = useSettingsStore((s) => s.goToStep)

  return (
    <div className="flex flex-wrap gap-6">
      {([1, 2, 3] as Step[]).map((n) => {
        const isCurrent = step === n
        const isDone = maxStepReached > n
        const isReachable = n <= maxStepReached
        return (
          <button
            key={n}
            type="button"
            disabled={!isReachable}
            onClick={() => goToStep(n)}
            className="flex min-h-11 items-center gap-2.5 disabled:cursor-not-allowed"
          >
            <span
              className={`flex h-[30px] w-[30px] items-center justify-center rounded-full text-[15px] font-bold ${
                isCurrent
                  ? 'bg-brand text-surface'
                  : isDone
                    ? 'bg-green-soft text-green-text'
                    : 'bg-canvas text-ink-muted'
              }`}
            >
              {n}
            </span>
            <span className={`text-base ${isCurrent ? 'font-bold text-ink' : 'text-ink-muted'}`}>{STEP_LABELS[n]}</span>
          </button>
        )
      })}
    </div>
  )
}

function StepOneMapping() {
  const mapping = useSettingsStore((s) => s.mapping)
  const setMapping = useSettingsStore((s) => s.setMapping)
  const goNext = useSettingsStore((s) => s.goNext)

  return (
    <div className="flex flex-col gap-3.5">
      <div className="text-base text-ink">Empareja cada columna de tu archivo con un campo de Áurea.</div>

      <div className="flex flex-col gap-3 lg:hidden">
        {csvColumns.map((col) => (
          <label key={col.fileColumn} className="flex flex-col gap-1.5">
            <span className="text-[15px] font-semibold text-ink">{col.fileColumn}</span>
            <select
              value={mapping[col.fileColumn]}
              onChange={(e) => setMapping(col.fileColumn, e.target.value)}
              className="min-h-11 rounded-md border border-line bg-surface px-3 text-base text-ink"
            >
              {Object.entries(FIELD_LABELS).map(([field, label]) => (
                <option key={field} value={field}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border border-line lg:block">
        <table className="w-full min-w-[420px] border-collapse">
          <thead>
            <tr>
              <th className="border-b border-line px-4 py-2 text-left text-[13px] font-semibold tracking-[0.06em] text-ink-muted uppercase">
                Columna del archivo
              </th>
              <th className="border-b border-line px-4 py-2 text-left text-[13px] font-semibold tracking-[0.06em] text-ink-muted uppercase">
                Campo en Áurea
              </th>
            </tr>
          </thead>
          <tbody>
            {csvColumns.map((col) => (
              <tr key={col.fileColumn}>
                <td className="border-b border-[#f0f3f1] px-4 py-2.5 text-base text-ink last:border-b-0">{col.fileColumn}</td>
                <td className="border-b border-[#f0f3f1] px-4 py-2.5 last:border-b-0">
                  <select
                    value={mapping[col.fileColumn]}
                    onChange={(e) => setMapping(col.fileColumn, e.target.value)}
                    className="min-h-10 rounded-md border border-line bg-surface px-2.5 text-[15px] text-ink"
                  >
                    {Object.entries(FIELD_LABELS).map(([field, label]) => (
                      <option key={field} value={field}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={goNext}
        className="min-h-11 self-start rounded-md border border-brand bg-brand px-[18px] text-base font-semibold text-surface hover:bg-brand-hover"
      >
        Continuar
      </button>
    </div>
  )
}

function StepTwoPreview() {
  const goNext = useSettingsStore((s) => s.goNext)
  const goBack = useSettingsStore((s) => s.goBack)

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap gap-6 tabular">
        <div className="rounded-xl border border-green-soft-line bg-green-soft px-[18px] py-3.5">
          <div className="text-[22px] font-bold text-green-text">{csvImportResult.newRows}</div>
          <div className="text-sm text-green-text">Altas nuevas</div>
        </div>
        <div className="rounded-xl border border-line bg-canvas px-[18px] py-3.5">
          <div className="text-[22px] font-bold text-ink-muted">{csvImportResult.duplicateRows}</div>
          <div className="text-sm text-ink-muted">Duplicados detectados</div>
        </div>
        <div className="rounded-xl border border-danger-line bg-danger-bg px-[18px] py-3.5">
          <div className="text-[22px] font-bold text-danger-text">{csvImportResult.rejectedRows}</div>
          <div className="text-sm text-danger-text">Filas rechazadas</div>
        </div>
      </div>
      <div className="text-[15px] text-ink-muted">{csvImportResult.rejectionReason}</div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={goBack}
          className="min-h-11 rounded-md border border-line bg-surface px-[18px] text-base font-semibold text-ink hover:bg-canvas"
        >
          Atrás
        </button>
        <button
          type="button"
          onClick={goNext}
          className="min-h-11 rounded-md border border-brand bg-brand px-[18px] text-base font-semibold text-surface hover:bg-brand-hover"
        >
          Continuar
        </button>
      </div>
    </div>
  )
}

function StepThreeConfirm() {
  const goBack = useSettingsStore((s) => s.goBack)
  const importConfirmed = useSettingsStore((s) => s.importConfirmed)
  const confirmImport = useSettingsStore((s) => s.confirmImport)

  return (
    <div className="flex flex-col gap-3.5">
      <div className="text-base text-ink tabular">
        Vas a importar <span className="font-semibold">{csvImportResult.newRows}</span> movimientos nuevos. Los{' '}
        {csvImportResult.duplicateRows} duplicados y las {csvImportResult.rejectedRows} filas rechazadas no se
        importarán.
      </div>
      {importConfirmed ? (
        <Badge variant="success">Importación confirmada</Badge>
      ) : (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={goBack}
            className="min-h-11 rounded-md border border-line bg-surface px-[18px] text-base font-semibold text-ink hover:bg-canvas"
          >
            Atrás
          </button>
          <button
            type="button"
            onClick={confirmImport}
            className="min-h-11 rounded-md border border-brand bg-brand px-[18px] text-base font-bold text-surface hover:bg-brand-hover"
          >
            Confirmar importación
          </button>
        </div>
      )}
    </div>
  )
}

/** Importación CSV en tres pasos navegables adelante y atrás, sin perder lo ya mapeado. */
export function ImportCsvPanel() {
  const step = useSettingsStore((s) => s.step)

  return (
    <Card padding="lg" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <h2 className="font-serif text-2xl font-semibold text-ink">Importar movimientos desde CSV</h2>
        <Badge variant="neutral" icon="">
          Demostración
        </Badge>
      </div>
      <StepIndicator />
      {step === 1 && <StepOneMapping />}
      {step === 2 && <StepTwoPreview />}
      {step === 3 && <StepThreeConfirm />}
    </Card>
  )
}
