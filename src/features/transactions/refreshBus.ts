import { create } from 'zustand'

interface TransactionsRefreshBus {
  version: number
  bump: () => void
}

/**
 * Varias pantallas montan su propia instancia de `useRealTransactions`
 * (AppShell para el contador del menú, Inicio, Movimientos...) — sin esto,
 * refrescar una no avisa a las demás y, por ejemplo, el contador del menú
 * se queda con el número de pendientes de antes de clasificar en bloque.
 */
export const useTransactionsRefreshBus = create<TransactionsRefreshBus>((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 })),
}))
