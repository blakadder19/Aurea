import { useState } from 'react'
import { Badge } from '../../components/Badge'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/states/EmptyState'
import type { Account } from '../../data/accounts'
import {
  buildImportPreview,
  guessMapping,
  mapRows,
  parseCsv,
  type ImportField,
  type ImportPreviewRow,
  type ParsedCsv,
} from '../../lib/csvImport'
import { fetchExistingDedupeKeys, importManualTransactions } from '../accounts/useManualEntries'

const FIELD_LABELS: Record<ImportField, string> = {
  fecha: 'Fecha',
  comercio: 'Comercio o descripción',
  importe: 'Importe',
  nota: 'Nota',
  ignorar: 'Ignorar esta columna',
}

type Step = 'subir' | 'mapear' | 'previsualizar' | 'confirmar'

const STEP_LABELS: Record<Step, string> = {
  subir: 'Subir archivo',
  mapear: 'Mapear columnas',
  previsualizar: 'Previsualizar',
  confirmar: 'Confirmar',
}

function UploadStep({
  manualAccounts,
  accountId,
  onAccountChange,
  onFileParsed,
  error,
}: {
  manualAccounts: Account[]
  accountId: string
  onAccountChange: (id: string) => void
  onFileParsed: (parsed: ParsedCsv, fileName: string) => void
  error: string | null
}) {
  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => onFileParsed(parseCsv(String(reader.result ?? '')), file.name)
    reader.readAsText(file)
  }

  return (
    <div className="flex flex-col gap-3.5">
      <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink-muted">
        Cuenta manual de destino
        <select
          value={accountId}
          onChange={(e) => onAccountChange(e.target.value)}
          className="min-h-11 rounded-md border border-line px-3 py-[11px] text-base text-ink"
        >
          {manualAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-h-11 w-fit cursor-pointer items-center rounded-md border border-brand bg-brand px-[18px] text-base font-semibold text-surface hover:bg-brand-hover">
        Elegir archivo CSV
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
      </label>
      {error && <p className="text-sm text-danger-text">{error}</p>}
    </div>
  )
}

function MappingStep({
  header,
  mapping,
  onMappingChange,
  onNext,
}: {
  header: string[]
  mapping: Record<string, ImportField>
  onMappingChange: (col: string, field: ImportField) => void
  onNext: () => void
}) {
  const hasFecha = Object.values(mapping).includes('fecha')
  const hasImporte = Object.values(mapping).includes('importe')

  return (
    <div className="flex flex-col gap-3.5">
      <div className="text-base text-ink">Empareja cada columna de tu archivo con un campo de Áurea.</div>
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
            {header.map((col) => (
              <tr key={col}>
                <td className="border-b border-[#f0f3f1] px-4 py-2.5 text-base text-ink last:border-b-0">{col}</td>
                <td className="border-b border-[#f0f3f1] px-4 py-2.5 last:border-b-0">
                  <select
                    value={mapping[col]}
                    onChange={(e) => onMappingChange(col, e.target.value as ImportField)}
                    className="min-h-10 rounded-md border border-line bg-surface px-2.5 text-[15px] text-ink"
                  >
                    {(Object.entries(FIELD_LABELS) as [ImportField, string][]).map(([field, label]) => (
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
      {(!hasFecha || !hasImporte) && <p className="text-sm text-danger-text">Hace falta al menos una columna de Fecha y otra de Importe.</p>}
      <button
        type="button"
        disabled={!hasFecha || !hasImporte}
        onClick={onNext}
        className="min-h-11 self-start rounded-md border border-brand bg-brand px-[18px] text-base font-semibold text-surface hover:bg-brand-hover disabled:opacity-50"
      >
        Continuar
      </button>
    </div>
  )
}

function PreviewStep({ preview, onBack, onNext }: { preview: ImportPreviewRow[]; onBack: () => void; onNext: () => void }) {
  const accepted = preview.filter((r) => !r.rejectionReason && !r.isDuplicate)
  const duplicates = preview.filter((r) => !r.rejectionReason && r.isDuplicate)
  const rejected = preview.filter((r) => r.rejectionReason)

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap gap-6 tabular">
        <div className="rounded-xl border border-green-soft-line bg-green-soft px-[18px] py-3.5">
          <div className="text-[22px] font-bold text-green-text">{accepted.length}</div>
          <div className="text-sm text-green-text">Altas nuevas</div>
        </div>
        <div className="rounded-xl border border-line bg-canvas px-[18px] py-3.5">
          <div className="text-[22px] font-bold text-ink-muted">{duplicates.length}</div>
          <div className="text-sm text-ink-muted">Duplicados detectados</div>
        </div>
        <div className="rounded-xl border border-danger-line bg-danger-bg px-[18px] py-3.5">
          <div className="text-[22px] font-bold text-danger-text">{rejected.length}</div>
          <div className="text-sm text-danger-text">Filas rechazadas</div>
        </div>
      </div>
      {rejected.length > 0 && (
        <div className="text-[15px] text-ink-muted">
          Motivos de rechazo: {[...new Set(rejected.map((r) => r.rejectionReason))].join(', ')}.
        </div>
      )}
      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="min-h-11 rounded-md border border-line bg-surface px-[18px] text-base font-semibold text-ink hover:bg-canvas">
          Atrás
        </button>
        <button
          type="button"
          disabled={accepted.length === 0}
          onClick={onNext}
          className="min-h-11 rounded-md border border-brand bg-brand px-[18px] text-base font-semibold text-surface hover:bg-brand-hover disabled:opacity-50"
        >
          Continuar
        </button>
      </div>
    </div>
  )
}

function ConfirmStep({
  acceptedCount,
  duplicateCount,
  rejectedCount,
  onBack,
  onConfirm,
  importing,
  imported,
  error,
}: {
  acceptedCount: number
  duplicateCount: number
  rejectedCount: number
  onBack: () => void
  onConfirm: () => void
  importing: boolean
  imported: boolean
  error: string | null
}) {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="text-base text-ink tabular">
        Vas a importar <span className="font-semibold">{acceptedCount}</span> movimientos nuevos. Los {duplicateCount} duplicados y las{' '}
        {rejectedCount} filas rechazadas no se importarán.
      </div>
      {error && <p className="text-sm text-danger-text">{error}</p>}
      {imported ? (
        <Badge variant="success">Importación confirmada</Badge>
      ) : (
        <div className="flex gap-3">
          <button type="button" disabled={importing} onClick={onBack} className="min-h-11 rounded-md border border-line bg-surface px-[18px] text-base font-semibold text-ink hover:bg-canvas">
            Atrás
          </button>
          <button
            type="button"
            disabled={importing}
            onClick={onConfirm}
            className="min-h-11 rounded-md border border-brand bg-brand px-[18px] text-base font-bold text-surface hover:bg-brand-hover disabled:opacity-50"
          >
            {importing ? 'Importando…' : 'Confirmar importación'}
          </button>
        </div>
      )}
    </div>
  )
}

interface RealImportCsvPanelProps {
  manualAccounts: Account[]
  onDone: () => void
}

/** Importación real de un CSV bancario a una cuenta manual: subir, mapear columnas, previsualizar altas/duplicados/rechazos, confirmar. */
export function RealImportCsvPanel({ manualAccounts, onDone }: RealImportCsvPanelProps) {
  const [step, setStep] = useState<Step>('subir')
  const [accountId, setAccountId] = useState(manualAccounts[0]?.id ?? '')
  const [fileName, setFileName] = useState('')
  const [parsed, setParsed] = useState<ParsedCsv | null>(null)
  const [mapping, setMapping] = useState<Record<string, ImportField>>({})
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [preview, setPreview] = useState<ImportPreviewRow[]>([])
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  if (manualAccounts.length === 0) {
    return (
      <Card padding="lg" className="flex flex-col gap-5">
        <h2 className="font-serif text-2xl font-semibold text-ink">Importar movimientos desde CSV</h2>
        <EmptyState
          headline="Primero necesitas una cuenta manual"
          body="Un CSV importado necesita una cuenta manual donde vivir — las cuentas sincronizadas con tu banco siempre reflejan lo que dice el banco. Créala desde Cuentas y patrimonio."
          action={{ label: 'Ir a Cuentas y patrimonio', to: '/cuentas' }}
        />
      </Card>
    )
  }

  function handleFileParsed(csv: ParsedCsv, name: string) {
    if (csv.rows.length === 0) {
      setUploadError('No hemos encontrado filas en ese archivo.')
      return
    }
    setUploadError(null)
    setParsed(csv)
    setFileName(name)
    setMapping(guessMapping(csv.header))
    setStep('mapear')
  }

  async function handleGoToPreview() {
    if (!parsed) return
    const rows = mapRows(parsed.rows, parsed.header, mapping)
    const existingKeys = await fetchExistingDedupeKeys(accountId)
    setPreview(buildImportPreview(rows, existingKeys))
    setStep('previsualizar')
  }

  async function handleConfirm() {
    setImporting(true)
    setConfirmError(null)
    const accepted = preview.filter((r) => !r.rejectionReason && !r.isDuplicate)
    const error = await importManualTransactions(
      accountId,
      accepted.map((r) => ({
        dateIso: r.mapped.dateIso!,
        description: r.mapped.description,
        amountCents: r.mapped.amountCents!,
        note: r.mapped.note,
      })),
    )
    setImporting(false)
    if (error) setConfirmError(error)
    else {
      setImported(true)
      onDone()
    }
  }

  const accepted = preview.filter((r) => !r.rejectionReason && !r.isDuplicate)
  const duplicates = preview.filter((r) => !r.rejectionReason && r.isDuplicate)
  const rejected = preview.filter((r) => r.rejectionReason)

  return (
    <Card padding="lg" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <h2 className="font-serif text-2xl font-semibold text-ink">Importar movimientos desde CSV</h2>
        {fileName && <span className="text-[15px] text-ink-muted">{fileName}</span>}
      </div>
      <div className="flex flex-wrap gap-6">
        {(['subir', 'mapear', 'previsualizar', 'confirmar'] as Step[]).map((s) => (
          <span key={s} className={`text-base ${step === s ? 'font-bold text-ink' : 'text-ink-muted'}`}>
            {STEP_LABELS[s]}
          </span>
        ))}
      </div>
      {step === 'subir' && (
        <UploadStep manualAccounts={manualAccounts} accountId={accountId} onAccountChange={setAccountId} onFileParsed={handleFileParsed} error={uploadError} />
      )}
      {step === 'mapear' && parsed && (
        <MappingStep
          header={parsed.header}
          mapping={mapping}
          onMappingChange={(col, field) => setMapping((m) => ({ ...m, [col]: field }))}
          onNext={() => void handleGoToPreview()}
        />
      )}
      {step === 'previsualizar' && <PreviewStep preview={preview} onBack={() => setStep('mapear')} onNext={() => setStep('confirmar')} />}
      {step === 'confirmar' && (
        <ConfirmStep
          acceptedCount={accepted.length}
          duplicateCount={duplicates.length}
          rejectedCount={rejected.length}
          onBack={() => setStep('previsualizar')}
          onConfirm={() => void handleConfirm()}
          importing={importing}
          imported={imported}
          error={confirmError}
        />
      )}
    </Card>
  )
}
