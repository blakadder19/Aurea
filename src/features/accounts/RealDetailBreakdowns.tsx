import { Card } from '../../components/Card'
import { Money } from '../../components/Money'
import type { Account, AccountFunction } from '../../data/accounts'

function BreakdownCard({ title, rows }: { title: string; rows: { label: string; amount: number; negative?: boolean }[] }) {
  return (
    <Card padding="lg" className="flex flex-col gap-4">
      <h2 className="font-serif text-[22px] lg:text-[19px] font-semibold text-ink">{title}</h2>
      <div className="flex flex-col gap-2.5 tabular">
        {rows.map((row) => (
          <div
            key={row.label}
            className={`flex justify-between text-base ${
              row.negative ? 'border-t border-line pt-2.5 text-danger-text' : 'text-ink'
            }`}
          >
            <span>{row.label}</span>
            <Money value={row.amount} tone={row.negative ? 'danger' : 'ink'} className="font-bold" />
          </div>
        ))}
      </div>
    </Card>
  )
}

const ASSET_CLASS_LABEL: Record<AccountFunction, string> = {
  'Para gastar': 'Efectivo y cuentas',
  Ahorro: 'Efectivo y cuentas',
  Inversión: 'Inversión (cuentas)',
  'Activo manual': 'Otros activos manuales',
  'Por confirmar': 'Sin clasificar',
  Deuda: 'Deudas',
}

const share = (a: Account) => a.balance * ((a.sharePercent ?? 100) / 100)

/**
 * Solo en Detalle, con sesión real: por clase de activo (derivado de la
 * función de cada cuenta — sin "Inmuebles", que Áurea no rastrea) y por
 * institución. Solo cuentas en EUR, igual que los KPIs de la cabecera; las
 * divisas extranjeras ya se muestran aparte y no se convierten.
 */
export function RealDetailBreakdowns({ accounts }: { accounts: Account[] }) {
  const eurAccounts = accounts.filter((a) => a.currency === undefined || a.currency === 'EUR')

  const byClass = new Map<string, number>()
  for (const a of eurAccounts) {
    const label = ASSET_CLASS_LABEL[a.fn]
    byClass.set(label, (byClass.get(label) ?? 0) + share(a))
  }
  const classRows = [...byClass.entries()]
    .filter(([, amount]) => amount !== 0)
    .map(([label, amount]) => ({ label, amount, negative: label === 'Deudas' }))

  const byInstitution = new Map<string, number>()
  for (const a of eurAccounts) {
    byInstitution.set(a.institution, (byInstitution.get(a.institution) ?? 0) + share(a))
  }
  const institutionRows = [...byInstitution.entries()]
    .filter(([, amount]) => amount !== 0)
    .sort((a, b) => b[1] - a[1])
    .map(([label, amount]) => ({ label, amount, negative: amount < 0 }))

  if (classRows.length === 0 && institutionRows.length === 0) return null

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <BreakdownCard title="Por clase de activo" rows={classRows} />
      <BreakdownCard title="Por institución" rows={institutionRows} />
    </div>
  )
}
