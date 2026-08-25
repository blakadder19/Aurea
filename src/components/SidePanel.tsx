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
 * Overlay derecho de 460 px en escritorio; por debajo de 1024 px pasa a hoja
 * inferior a altura casi completa, con el mismo contenido y jerarquía.
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
          className="fixed inset-x-0 bottom-0 top-auto z-50 flex max-h-[92vh] w-full flex-col gap-[18px] overflow-y-auto rounded-t-[20px] bg-surface p-6 focus:outline-none lg:inset-x-auto lg:top-0 lg:right-0 lg:bottom-0 lg:h-full lg:max-h-none lg:w-[460px] lg:max-w-[100vw] lg:gap-3.5 lg:rounded-none lg:p-6"
        >
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
