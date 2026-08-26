import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AppShell } from './AppShell'
import { RouteFallback } from './RouteFallback'

const HomePage = lazy(() => import('../features/home/HomePage').then((m) => ({ default: m.HomePage })))
const TransactionsPage = lazy(() => import('../features/transactions/TransactionsPage').then((m) => ({ default: m.TransactionsPage })))
const BudgetPage = lazy(() => import('../features/budget/BudgetPage').then((m) => ({ default: m.BudgetPage })))
const AccountsPage = lazy(() => import('../features/accounts/AccountsPage').then((m) => ({ default: m.AccountsPage })))
const RecurringPage = lazy(() => import('../features/recurring/RecurringPage').then((m) => ({ default: m.RecurringPage })))
const GoalsPage = lazy(() => import('../features/goals/GoalsPage').then((m) => ({ default: m.GoalsPage })))
const InvestmentsPage = lazy(() => import('../features/investments/InvestmentsPage').then((m) => ({ default: m.InvestmentsPage })))
const DebtsPage = lazy(() => import('../features/debts/DebtsPage').then((m) => ({ default: m.DebtsPage })))
const PlanningPage = lazy(() => import('../features/planning/PlanningPage').then((m) => ({ default: m.PlanningPage })))
const AssistantPage = lazy(() => import('../features/assistant/AssistantPage').then((m) => ({ default: m.AssistantPage })))
const ReportsPage = lazy(() => import('../features/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const SettingsPage = lazy(() => import('../features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const MorePage = lazy(() => import('./MorePage').then((m) => ({ default: m.MorePage })))
const StatesPage = lazy(() => import('../features/states/StatesPage').then((m) => ({ default: m.StatesPage })))
const LoginPage = lazy(() => import('../features/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const BankConnectionCallback = lazy(() =>
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
