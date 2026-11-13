import { Dialog as DialogPrimitive } from 'radix-ui'
import type { ReactNode } from 'react'
import { ModalHeader, withoutDescription } from './Modal'

type DrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  /** A `ModalBody`, usually followed by a `ModalFooter`. */
  children: ReactNode
}

/** Right-hand panel used for filters, creating contacts and view settings. */
export function Drawer({ open, onOpenChange, title, description, children }: DrawerProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 animate-fade-in bg-gray-900/30" />
        <DialogPrimitive.Content
          className="fixed inset-y-0 right-0 z-50 flex w-full animate-slide-in-right flex-col bg-white shadow-xl sm:max-w-md"
          {...withoutDescription(description)}
        >
          <ModalHeader title={title} description={description} />
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
