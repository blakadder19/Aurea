/**
 * Desglose de la categoría "Otros" por comercio, en los 3 ciclos cerrados.
 *
 * Lee el JSON que descarga Ajustes → "Descargar todos mis datos"
 * (`exportAllDataJson`), no la base de datos: así no hacen falta ni
 * contraseña ni token.
 *
 * Reproduce la regla de gasto de la app (`fetchProposedBudget` +
 * `reimbursements.ts`): traspasos internos fuera, ajustes de saldo fuera y
 * reembolsos restando. Antes del listado imprime la propuesta de presupuesto
 * que sale de estos datos, para contrastarla con la pantalla: si no coinciden,
 * el desglose no vale.
 *
 * Uso:
 *   node scripts/desglose-otros.mjs tmp/aurea-datos-2026-08-31.json
 */
import { readFileSync } from 'node:fs'

const path = process.argv[2]
if (!path) {
  console.error('Uso: node scripts/desglose-otros.mjs <ruta-al-export.json>')
  process.exit(1)
}
const data = JSON.parse(readFileSync(path, 'utf8'))

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

const median = (values) => {
  if (values.length === 0) return 0
  const s = [...values].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m]
}
const roundUpToNearest = (cents, step) => Math.ceil(cents / step) * step

const eur = (cents) =>
  (cents / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

// --- Ventana de los 3 ciclos cerrados --------------------------------------
// El export no incluye user_settings; el inicio de ciclo se puede pasar como
// segundo argumento si no es el día 1.
const startDay = Number(process.argv[3] ?? 1)
const PROPOSAL_CYCLES = 3
const today = new Date()
const cycles = Array.from({ length: PROPOSAL_CYCLES }, (_, i) => shiftedCycleStart(today, startDay, i + 1))
const from = isoDate(cycles[cycles.length - 1])
const to = isoDate(cycleEnd(cycles[0]))
const cycleStarts = [...cycles].reverse().map(isoDate) // más antiguo primero

// --- Categorías ------------------------------------------------------------
const categories = data.categories ?? []
const otros = categories.filter((c) => (c.name ?? '').trim().toLowerCase() === 'otros')
if (otros.length === 0) {
  console.error('No hay ninguna categoría llamada "Otros". Hay:', categories.map((c) => c.name).join(', '))
  process.exit(1)
}
// Si "Otros" ya tuviera hijas, el gasto vive en las hojas: hay que incluirlas.
const otrosIds = new Set(otros.map((c) => c.id))
for (const c of categories) if (c.parent_id && otrosIds.has(c.parent_id)) otrosIds.add(c.id)
const nameById = new Map(categories.map((c) => [c.id, c.name]))
const accountById = new Map((data.accounts ?? []).map((a) => [a.id, a]))

// --- Agregación ------------------------------------------------------------
const byMerchant = new Map()
const perCycleTotal = Array.from({ length: PROPOSAL_CYCLES }, () => 0)
const currenciesSeen = new Set()
const subcatsSeen = new Set()

for (const t of data.transactions ?? []) {
  if (!t.category_id || !otrosIds.has(t.category_id)) continue
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
  perCycleTotal[index] += cents
  currenciesSeen.add(t.currency ?? '?')
  if (t.category_id !== otros[0].id) subcatsSeen.add(nameById.get(t.category_id))

  const name = (t.description ?? '').trim() || 'Sin descripción'
  const agg = byMerchant.get(name) ?? {
    name,
    total: 0,
    count: 0,
    perCycle: Array.from({ length: PROPOSAL_CYCLES }, () => 0),
    accounts: new Set(),
  }
  agg.total += cents
  agg.count++
  agg.perCycle[index] += cents
  const acc = accountById.get(t.account_id)
  agg.accounts.add(acc ? `${acc.name ?? acc.product ?? 'sin nombre'} (${acc.currency})` : '?')
  byMerchant.set(name, agg)
}

// --- Salida ----------------------------------------------------------------
const label = (i) => cycleStarts[i].slice(0, 7)
const grandTotal = perCycleTotal.reduce((a, b) => a + b, 0)

console.log(`\nCategoría "Otros" — ciclos cerrados, ventana [${from}, ${to})`)
console.log(`Export del ${data.exportedAt ?? '?'} · inicio de ciclo: día ${startDay}`)
if (subcatsSeen.size > 0) console.log(`Subcategorías ya existentes bajo Otros: ${[...subcatsSeen].join(', ')}`)
if (currenciesSeen.size > 1)
  console.log(`⚠️  Varias divisas sumadas sin convertir: ${[...currenciesSeen].join(', ')} — el total no son euros del todo.`)

console.log('\n--- Comprobación contra la pantalla ---')
for (let i = 0; i < PROPOSAL_CYCLES; i++) console.log(`  ${label(i)}: ${eur(perCycleTotal[i]).padStart(12)}`)
const med = median(perCycleTotal.filter((c) => c > 0))
console.log(`  mediana:  ${eur(med).padStart(12)}`)
console.log(`  propuesta (mediana redondeada al alza a 10 €): ${eur(roundUpToNearest(med, 1000))}`)
console.log('  ^ contrastar con lo que ofrece "Proponer según lo que gasto" en Presupuesto.')
console.log('    Si no coincide, estoy leyendo otra cosa y el desglose de abajo no vale.')

console.log('\n--- Desglose por comercio ---')
const sorted = [...byMerchant.values()].sort((a, b) => b.total - a.total)
const w = Math.min(48, Math.max(8, ...sorted.map((m) => m.name.length)))
let cum = 0
console.log(
  `${'#'.padStart(3)}  ${'Comercio'.padEnd(w)}  ${'Total'.padStart(11)}  ${'%'.padStart(5)}  ${'acum'.padStart(5)}  ${'n'.padStart(3)}  ${label(0).padStart(10)}  ${label(1).padStart(10)}  ${label(2).padStart(10)}  Cuenta(s)`,
)
for (const [i, m] of sorted.entries()) {
  cum += m.total
  console.log(
    `${String(i + 1).padStart(3)}  ${m.name.slice(0, w).padEnd(w)}  ${eur(m.total).padStart(11)}  ${((m.total / grandTotal) * 100).toFixed(1).padStart(5)}  ${((cum / grandTotal) * 100).toFixed(1).padStart(5)}  ${String(m.count).padStart(3)}  ${m.perCycle.map((c) => (c ? eur(c) : '—').padStart(10)).join('  ')}  ${[...m.accounts].join(', ')}`,
  )
}

console.log(`\n${sorted.length} comercios, ${sorted.reduce((n, m) => n + m.count, 0)} apuntes, ${eur(grandTotal)} en total.`)
