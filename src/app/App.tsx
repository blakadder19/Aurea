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

export function App() {
  return (
    <Routes>
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
      </Route>
    </Routes>
  )
}
