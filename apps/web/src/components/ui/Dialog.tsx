import { Dialog as DialogPrimitive } from 'radix-ui'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { ModalHeader, withoutDescription } from './Modal'

type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  /** A `ModalBody`, usually followed by a `ModalFooter`. */
  children: ReactNode
  size?: 'md' | 'lg'
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = 'md',
}: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 animate-fade-in bg-gray-900/40" />
        <DialogPrimitive.Content
          className={cn(
            'fixed top-1/2 left-1/2 z-50 flex max-h-[90dvh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 animate-fade-in flex-col rounded-xl bg-white shadow-xl',
            size === 'md' ? 'max-w-md' : 'max-w-2xl',
          )}
          {...withoutDescription(description)}
        >
          <ModalHeader title={title} description={description} />
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
