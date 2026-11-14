import { AlertDialog } from 'radix-ui'
import type { ReactNode } from 'react'
import { t } from '../../i18n'
import { Button } from './Button'

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel: string
  onConfirm: () => void
  /** Red confirm button for actions that remove something. */
  destructive?: boolean
}

/**
 * Asks before an action that removes something. Focus starts on Cancel, so pressing Enter
 * by habit never confirms by accident.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive = false,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 animate-fade-in bg-gray-900/40" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 animate-fade-in rounded-xl bg-white p-5 shadow-xl">
          <AlertDialog.Title className="text-base font-semibold text-gray-900">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-gray-600">
            {description}
          </AlertDialog.Description>
          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button>{t.common.cancel}</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
