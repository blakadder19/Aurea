/**
 * Gasto por cuenta en los 3 ciclos cerrados, con el `share_percent` de cada
 * una, y cuánto cambiaría cada categoría si el gasto se ponderase igual que
 * ya se pondera el patrimonio.
 *
 * Para qué: `accounts.share_percent` existe y se aplica al saldo
 * (`src/lib/netWorth.ts:14`) pero NO al gasto — ni `useRealBudget` ni
 * `reportCalc` ni la vista `transaction_category_amounts` lo miran. Así que
 * de una cuenta conjunta al 50 %, Áurea cuenta medio saldo como tuyo y el
 * gasto entero. Esto mide el tamaño de esa contradicción.
 *
 * SOLO MIDE. No escribe nada, ni en disco ni en la base de datos. La columna
 * ponderada es una simulación para la conversación, no una propuesta aplicada.
 *
 * Lee el JSON de Ajustes → "Descargar todos mis datos".
 *
 * Uso:
 *   node scripts/gasto-por-cuenta.mjs tmp/aurea-datos-2026-08-31.json [diaInicioCiclo]
 */
import { readFileSync } from 'node:fs'

const path = process.argv[2]
if (!path) {
  console.error('Uso: node scripts/gasto-por-cuenta.mjs <ruta-al-export.json> [diaInicioCiclo]')
  process.exit(1)
}
const data = JSON.parse(readFileSync(path, 'utf8'))
const startDay = Number(process.argv[3] ?? 1)

// --- Copias literales de la lógica de la app -------------------------------
const isoDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const cycleStart = (today, startDay) =>
  new Date(today.getFullYear(), today.getMonth() + (today.getDate() >= startDay ? 0 : -1), startDay)
const cycleEnd = (start) => new Date(start.getFullYear(), start.getMonth() + 1, start.getDate())
const shiftedCycleStart = (today, startDay, monthOffset) => {
  const c = cycleStart(today, startDay)
  return new Date(c.getFullYear(), c.getMonth() - monthOffset, c.getDate())
}

const isNeutral = (tx) => Boolean(tx.isInternalTransfer || tx.isBalanceAdjustment)
const expenseContribution = (tx) => {
  if (isNeutral(tx)) return 0
  if (tx.isReimbursement) return tx.amountCents > 0 ? -tx.amountCents : 0
  return tx.amountCents < 0 ? -tx.amountCents : 0
}
const countsTowardCategorySpend = (tx) => {
  if (isNeutral(tx)) return false
  return tx.isReimbursement ? tx.amountCents > 0 : tx.amountCents < 0
}

const eur = (cents) =>
  (cents / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
/** Mismo heurístico que la UI (`AccountDetailPanel.tsx:15`): Enable Banking usa "NOMBRE1 & NOMBRE2". */
const looksJoint = (name) => / & /.test(name ?? '')

// --- Ventana ---------------------------------------------------------------
const CYCLES = 3
const today = new Date()
const cycles = Array.from({ length: CYCLES }, (_, i) => shiftedCycleStart(today, startDay, i + 1))
const from = isoDate(cycles[cycles.length - 1])
const to = isoDate(cycleEnd(cycles[0]))
const cycleStarts = [...cycles].reverse().map(isoDate)
const label = (i) => cycleStarts[i].slice(0, 7)

const accounts = data.accounts ?? []
const categories = data.categories ?? []
const accountById = new Map(accounts.map((a) => [a.id, a]))
const catById = new Map(categories.map((c) => [c.id, c]))
const accName = (a) => (a?.display_name || a?.name || a?.product || 'Cuenta') + (a ? ` (${a.currency})` : '')
/** El gasto se agrupa por la categoría madre, igual que Informes. */
const rootCat = (id) => {
  const c = catById.get(id)
  if (!c) return 'Sin clasificar'
  return c.parent_id ? (catById.get(c.parent_id)?.name ?? c.name) : c.name
}

// --- Agregación ------------------------------------------------------------
const zeros = () => Array.from({ length: CYCLES }, () => 0)
const perAccount = new Map() // accountId -> { total, perCycle, byCategory, byMerchant }
const perCategory = new Map() // categoría raíz -> { total, jointCents, weightedTotal, perCycle }
const currenciesSeen = new Set()

for (const t of data.transactions ?? []) {
  if (t.is_internal_transfer) continue
  const tx = {
    amountCents: t.amount_cents,
    isReimbursement: Boolean(t.is_reimbursement),
    isBalanceAdjustment: Boolean(t.is_balance_adjustment),
  }
  if (!countsTowardCategorySpend(tx)) continue
  const iso = t.booking_date ?? t.value_date
  if (!iso || iso < from || iso >= to) continue
  const index = cycleStarts.findLastIndex((s) => iso >= s)
  if (index === -1) continue

  const cents = expenseContribution(tx)
  const acc = accountById.get(t.account_id)
  const share = acc?.share_percent ?? 100
  const catName = t.category_id ? rootCat(t.category_id) : 'Sin clasificar'
  currenciesSeen.add(t.currency ?? '?')

  const a = perAccount.get(t.account_id) ?? {
    total: 0,
    perCycle: zeros(),
    byCategory: new Map(),
    byMerchant: new Map(),
  }
  a.total += cents
  a.perCycle[index] += cents
  a.byCategory.set(catName, (a.byCategory.get(catName) ?? 0) + cents)
  const m = (t.description ?? '').trim() || 'Sin descripción'
  const mAgg = a.byMerchant.get(m) ?? { total: 0, count: 0 }
  mAgg.total += cents
  mAgg.count++
  a.byMerchant.set(m, mAgg)
  perAccount.set(t.account_id, a)

  const c = perCategory.get(catName) ?? { total: 0, jointCents: 0, weightedTotal: 0, perCycle: zeros() }
  c.total += cents
  c.perCycle[index] += cents
  c.weightedTotal += (cents * share) / 100
  if (share < 100 || looksJoint(acc?.name)) c.jointCents += cents
  perCategory.set(catName, c)
}

// --- Salida ----------------------------------------------------------------
console.log(`\nGasto por cuenta — ciclos cerrados, ventana [${from}, ${to})`)
console.log(`Export del ${data.exportedAt ?? '?'} · inicio de ciclo: día ${startDay}`)
if (currenciesSeen.size > 1)
  console.log(`⚠️  Varias divisas sumadas sin convertir: ${[...currenciesSeen].join(', ')}.`)

console.log('\n--- Cuentas ---')
const accRows = [...perAccount.entries()]
  .map(([id, a]) => ({ acc: accountById.get(id), ...a }))
  .sort((x, y) => y.total - x.total)
const w = Math.min(44, Math.max(8, ...accRows.map((r) => accName(r.acc).length)))
console.log(
  `${'Cuenta'.padEnd(w)}  ${'share'.padStart(6)}  ${'Gasto 3 ciclos'.padStart(15)}  ${label(0).padStart(11)}  ${label(1).padStart(11)}  ${label(2).padStart(11)}`,
)
for (const r of accRows) {
  const share = r.acc?.share_percent ?? 100
  const flag = share === 100 && looksJoint(r.acc?.name) ? ' ←conjunta sin %' : ''
  console.log(
    `${accName(r.acc).slice(0, w).padEnd(w)}  ${(share + '%').padStart(6)}  ${eur(r.total).padStart(15)}  ${r.perCycle.map((c) => eur(c).padStart(11)).join('  ')}${flag}`,
  )
}

// Detalle de las cuentas compartidas (por % o por nombre).
const jointRows = accRows.filter((r) => (r.acc?.share_percent ?? 100) < 100 || looksJoint(r.acc?.name))
for (const r of jointRows) {
  console.log(`\n--- Detalle de ${accName(r.acc)} · share_percent = ${r.acc?.share_percent ?? 100}% ---`)
  console.log('  Por categoría:')
  for (const [cat, cents] of [...r.byCategory.entries()].sort((a, b) => b[1] - a[1]))
    console.log(`    ${cat.padEnd(28)} ${eur(cents).padStart(12)}`)
  console.log('  Comercios (top 15):')
  for (const [m, agg] of [...r.byMerchant.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 15))
    console.log(`    ${m.slice(0, 40).padEnd(40)} ${eur(agg.total).padStart(12)}  ×${agg.count}`)
}

if (jointRows.length === 0) {
  console.log('\nNo hay ninguna cuenta con share_percent < 100 ni con " & " en el nombre.')
} else {
  console.log('\n--- Impacto por categoría si el gasto se ponderase por share_percent ---')
  console.log('(simulación: hoy la app NO hace esto)')
  const catRows = [...perCategory.entries()].sort((a, b) => b[1].total - a[1].total)
  const cw = Math.min(30, Math.max(10, ...catRows.map(([c]) => c.length)))
  console.log(
    `${'Categoría'.padEnd(cw)}  ${'Hoy'.padStart(12)}  ${'De conjunta'.padStart(12)}  ${'Ponderado'.padStart(12)}  ${'Diferencia'.padStart(12)}`,
  )
  for (const [cat, c] of catRows) {
    const diff = c.weightedTotal - c.total
    console.log(
      `${cat.slice(0, cw).padEnd(cw)}  ${eur(c.total).padStart(12)}  ${eur(c.jointCents).padStart(12)}  ${eur(c.weightedTotal).padStart(12)}  ${(diff ? eur(diff) : '—').padStart(12)}`,
    )
  }
  const totalHoy = catRows.reduce((n, [, c]) => n + c.total, 0)
  const totalPond = catRows.reduce((n, [, c]) => n + c.weightedTotal, 0)
  console.log(`\n  Gasto total 3 ciclos: hoy ${eur(totalHoy)} · ponderado ${eur(totalPond)} · diferencia ${eur(totalPond - totalHoy)}`)
}
