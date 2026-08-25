import { Route, Routes } from 'react-router-dom'
import { AppShell } from './AppShell'
import { HomePage } from '../features/home/HomePage'
import { TransactionsPage } from '../features/transactions/TransactionsPage'
import { BudgetPage } from '../features/budget/BudgetPage'
import { AccountsPage } from '../features/accounts/AccountsPage'
import { RecurringPage } from '../features/recurring/RecurringPage'
import { GoalsPage } from '../features/goals/GoalsPage'
import { InvestmentsPage } from '../features/investments/InvestmentsPage'
import { DebtsPage } from '../features/debts/DebtsPage'
import { PlanningPage } from '../features/planning/PlanningPage'
import { AssistantPage } from '../features/assistant/AssistantPage'
import { ReportsPage } from '../features/reports/ReportsPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { MorePage } from './MorePage'
import { StatesPage } from '../features/states/StatesPage'
import { LoginPage } from '../features/auth/LoginPage'
import { BankConnectionCallback } from '../features/settings/BankConnectionCallback'

export function App() {
  return (
    <Routes>
      <Route path="/entrar" element={<LoginPage />} />
      <Route path="/ajustes/banco/callback" element={<BankConnectionCallback />} />
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
