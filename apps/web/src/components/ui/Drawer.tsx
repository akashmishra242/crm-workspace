import { Dialog as DialogPrimitive } from 'radix-ui'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { t } from '../../i18n'
import { ConfirmDialog } from './ConfirmDialog'
import { ModalHeader, withoutDescription } from './Modal'

type DrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  /** A `ModalBody`, usually followed by a `DrawerFooter`. */
  children: ReactNode
}

type DrawerGuard = {
  setDirty: (dirty: boolean) => void
  /** Closes the drawer, asking first if the form inside has unsaved input. */
  requestClose: () => void
}

const DrawerContext = createContext<DrawerGuard | null>(null)

/**
 * For a form inside a drawer: while `dirty`, closing the drawer (Cancel, ×, Esc or a click
 * outside) asks before throwing the input away. Returns the guarded close for Cancel.
 */
export function useDrawerGuard(dirty: boolean): () => void {
  const guard = useContext(DrawerContext)
  useEffect(() => {
    guard?.setDirty(dirty)
  }, [guard, dirty])
  return guard?.requestClose ?? (() => {})
}

/** Right-hand panel used for filters, creating contacts and view settings. */
export function Drawer({ open, onOpenChange, title, description, children }: DrawerProps) {
  const dirty = useRef(false)
  const [confirming, setConfirming] = useState(false)

  const guard = useMemo<DrawerGuard>(
    () => ({
      setDirty: (value) => {
        dirty.current = value
      },
      requestClose: () => {
        if (dirty.current) setConfirming(true)
        else onOpenChange(false)
      },
    }),
    [onOpenChange],
  )

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : guard.requestClose())}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 animate-fade-in bg-gray-900/30" />
        <DialogPrimitive.Content
          className="fixed inset-y-0 right-0 z-50 flex w-full animate-slide-in-right flex-col bg-white shadow-xl sm:max-w-md"
          {...withoutDescription(description)}
        >
          <ModalHeader title={title} description={description} />
          <DrawerContext.Provider value={guard}>
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          </DrawerContext.Provider>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t.common.discardTitle}
        description={t.common.discardDescription}
        confirmLabel={t.common.discard}
        destructive
        onConfirm={() => {
          dirty.current = false
          onOpenChange(false)
        }}
      />
    </DialogPrimitive.Root>
  )
}

/**
 * Side panels end with their actions side by side at full width: easy to hit, and the same
 * in every drawer and in the contact form's save bar.
 */
export function DrawerFooter({ children }: { children: ReactNode }) {
  return (
    <footer className="grid grid-cols-2 gap-2 border-t border-gray-200 px-5 py-3">
      {children}
    </footer>
  )
}

/** A quiet secondary action (Reset, Clear all) at the top of a drawer's body. */
export function DrawerToolbar({ children }: { children: ReactNode }) {
  return <div className="-mt-1 mb-3 flex justify-end">{children}</div>
}
