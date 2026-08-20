import { Route, Routes } from 'react-router-dom'
import { AppShell } from './AppShell'
import { HomePage } from '../features/home/HomePage'
import { TransactionsPage } from '../features/transactions/TransactionsPage'
import { BudgetPage } from '../features/budget/BudgetPage'

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/movimientos" element={<TransactionsPage />} />
        <Route path="/presupuesto" element={<BudgetPage />} />
      </Route>
    </Routes>
  )
}
