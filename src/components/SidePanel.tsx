import * as Dialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'

interface SidePanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Permite decidir explícitamente a dónde vuelve el foco al cerrar. */
  onCloseAutoFocus?: (event: Event) => void
  children: ReactNode
}

/**
 * Overlay derecho de 460 px, altura completa, scroll propio.
 * Basado en Radix Dialog: foco atrapado, Esc y click en overlay cierran,
 * y el foco vuelve al elemento que abrió el panel.
 */
export function SidePanel({ open, onOpenChange, onCloseAutoFocus, children }: SidePanelProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgba(22,26,25,0.35)]" />
        <Dialog.Content
          onCloseAutoFocus={onCloseAutoFocus}
          className="fixed top-0 right-0 z-50 flex h-full w-[460px] max-w-[100vw] flex-col gap-[18px] overflow-y-auto bg-surface p-8 focus:outline-none"
        >
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
