import { X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import type { ReactNode } from 'react'
import { t } from '../../i18n'
import { Button } from './Button'

/** Title, optional description and close button: identical in every dialog and drawer. */
export function ModalHeader({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
      <div>
        <DialogPrimitive.Title className="text-base font-semibold text-gray-900">
          {title}
        </DialogPrimitive.Title>
        {description && (
          <DialogPrimitive.Description className="mt-1 text-sm text-gray-500">
            {description}
          </DialogPrimitive.Description>
        )}
      </div>
      {/* No tooltip here: focus lands on this button when a dialog opens. */}
      <DialogPrimitive.Close asChild>
        <Button
          variant="ghost"
          size="sm"
          square
          aria-label={t.common.close}
          className="-mt-1 -mr-2"
        >
          <X className="size-4" aria-hidden />
        </Button>
      </DialogPrimitive.Close>
    </header>
  )
}

export function ModalBody({ children }: { children: ReactNode }) {
  return <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
}

/** Actions row. A component rather than a prop so forms can wrap body and footer together. */
export function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 px-5 py-3">
      {children}
    </footer>
  )
}

/**
 * Radix links dialog content to its Description automatically. When a dialog has no
 * description, `aria-describedby` must be explicitly unset or Radix logs an a11y warning.
 */
export function withoutDescription(description: ReactNode): { 'aria-describedby'?: undefined } {
  return description ? {} : { 'aria-describedby': undefined }
}
