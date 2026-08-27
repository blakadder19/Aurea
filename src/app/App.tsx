import { Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AppShell } from './AppShell'
import { RouteFallback } from './RouteFallback'
import { lazyRoute } from './lazyRoute'

const HomePage = lazyRoute(() => import('../features/home/HomePage').then((m) => ({ default: m.HomePage })))
const TransactionsPage = lazyRoute(() => import('../features/transactions/TransactionsPage').then((m) => ({ default: m.TransactionsPage })))
const BudgetPage = lazyRoute(() => import('../features/budget/BudgetPage').then((m) => ({ default: m.BudgetPage })))
const AccountsPage = lazyRoute(() => import('../features/accounts/AccountsPage').then((m) => ({ default: m.AccountsPage })))
const IngresosPage = lazyRoute(() => import('../features/income/IngresosPage').then((m) => ({ default: m.IngresosPage })))
const RecurringPage = lazyRoute(() => import('../features/recurring/RecurringPage').then((m) => ({ default: m.RecurringPage })))
const GoalsPage = lazyRoute(() => import('../features/goals/GoalsPage').then((m) => ({ default: m.GoalsPage })))
const InvestmentsPage = lazyRoute(() => import('../features/investments/InvestmentsPage').then((m) => ({ default: m.InvestmentsPage })))
const DebtsPage = lazyRoute(() => import('../features/debts/DebtsPage').then((m) => ({ default: m.DebtsPage })))
const PlanningPage = lazyRoute(() => import('../features/planning/PlanningPage').then((m) => ({ default: m.PlanningPage })))
const AssistantPage = lazyRoute(() => import('../features/assistant/AssistantPage').then((m) => ({ default: m.AssistantPage })))
const ReportsPage = lazyRoute(() => import('../features/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const SettingsPage = lazyRoute(() => import('../features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const MorePage = lazyRoute(() => import('./MorePage').then((m) => ({ default: m.MorePage })))
const StatesPage = lazyRoute(() => import('../features/states/StatesPage').then((m) => ({ default: m.StatesPage })))
const LoginPage = lazyRoute(() => import('../features/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const BankConnectionCallback = lazyRoute(() =>
  import('../features/settings/BankConnectionCallback').then((m) => ({ default: m.BankConnectionCallback })),
)

/**
 * Cada ruta fuera de AppShell lleva su propio Suspense (son pantallas de
 * pantalla completa, sin sidebar que conservar). Las rutas dentro de
 * AppShell NO se envuelven aquí — su Suspense vive alrededor del <Outlet>
 * en AppShell.tsx, para que el sidebar nunca desaparezca al navegar.
 */
export function App() {
  return (
    <Routes>
      <Route
        path="/entrar"
        element={
          <Suspense fallback={<RouteFallback />}>
            <LoginPage />
          </Suspense>
        }
      />
      <Route
        path="/ajustes/banco/callback"
        element={
          <Suspense fallback={<RouteFallback />}>
            <BankConnectionCallback />
          </Suspense>
        }
      />
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/movimientos" element={<TransactionsPage />} />
        <Route path="/presupuesto" element={<BudgetPage />} />
        <Route path="/cuentas" element={<AccountsPage />} />
        <Route path="/ingresos" element={<IngresosPage />} />
        <Route path="/pagos" element={<RecurringPage />} />
        <Route path="/objetivos" element={<GoalsPage />} />
        <Route path="/inversiones" element={<InvestmentsPage />} />
        <Route path="/deudas" element={<DebtsPage />} />
        <Route path="/planificacion" element={<PlanningPage />} />
        <Route path="/asistente" element={<AssistantPage />} />
        <Route path="/informes" element={<ReportsPage />} />
        <Route path="/ajustes" element={<SettingsPage />} />
        <Route path="/mas" element={<MorePage />} />
        <Route path="/estados" element={<StatesPage />} />
      </Route>
    </Routes>
  )
}
