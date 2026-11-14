import { CircleAlert, CircleCheck, Info, Trash2, X } from 'lucide-react'
import { MOD_KEY } from '../../hooks/useKeyboardShortcut'
import { toast as sonner, Toaster as SonnerToaster } from 'sonner'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'

const TOAST_DURATION_MS = 5_000
/** Toasts with an action (Undo) stay longer, so there's time to use it. */
const ACTION_TOAST_DURATION_MS = 10_000

type ToastTone = 'success' | 'error' | 'info' | 'removed'

const TONES: Record<ToastTone, { icon: typeof CircleCheck; iconClass: string; barClass: string }> =
  {
    success: { icon: CircleCheck, iconClass: 'text-emerald-600', barClass: 'bg-emerald-500' },
    error: { icon: CircleAlert, iconClass: 'text-red-600', barClass: 'bg-red-500' },
    info: { icon: Info, iconClass: 'text-primary-600', barClass: 'bg-primary-500' },
    // Something was removed: neutral, not a green tick, because the user may want it back.
    removed: { icon: Trash2, iconClass: 'text-gray-500', barClass: 'bg-gray-300' },
  }

type ToastAction = { label: string; onClick: () => void; shortcut?: string }

type ToastCardProps = {
  id: string | number
  tone: ToastTone
  title: string
  description?: string
  action?: ToastAction
  /** Stays until acted on or dismissed, so there is no countdown bar. */
  persistent?: boolean
  durationMs?: number
}

/**
 * One toast design for the whole app: icon, message, close button and a bar that counts
 * down the time left. Sonner pauses the timer while the toasts are hovered, and the bar
 * pauses with it (Sonner marks hovered toasts with `data-expanded`).
 */
function ToastCard({
  id,
  tone,
  title,
  description,
  action,
  persistent,
  durationMs = TOAST_DURATION_MS,
}: ToastCardProps) {
  const { icon: Icon, iconClass, barClass } = TONES[tone]
  return (
    <div className="relative flex w-[380px] max-w-[calc(100vw-2rem)] items-start gap-3 overflow-hidden rounded-lg bg-white p-4 pb-5 shadow-lg ring-1 ring-gray-200">
      <Icon className={cn('mt-0.5 size-5 shrink-0', iconClass)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{title}</p>
        {description && <p className="mt-0.5 truncate text-sm text-gray-600">{description}</p>}
      </div>
      {/* The action sits on the right, at the same height as the message: easy to spot and hit. */}
      {action && (
        <button
          type="button"
          onClick={() => {
            sonner.dismiss(id)
            action.onClick()
          }}
          aria-label={action.label}
          aria-keyshortcuts={action.shortcut ? 'Control+Z Meta+Z' : undefined}
          className="inline-flex shrink-0 items-center gap-1.5 self-center rounded-md bg-primary-50 px-3 py-1.5 text-sm font-semibold text-primary-700 ring-1 ring-primary-100 transition-colors hover:bg-primary-100"
        >
          {action.label}
          {action.shortcut && (
            <kbd
              aria-hidden
              className="rounded bg-white/80 px-1 font-sans text-[10px] font-medium text-primary-700"
            >
              {action.shortcut}
            </kbd>
          )}
        </button>
      )}
      <button
        type="button"
        onClick={() => sonner.dismiss(id)}
        aria-label={t.common.dismissNotification}
        className="-mt-1 -mr-1 grid size-7 shrink-0 place-items-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700"
      >
        <X className="size-4" aria-hidden />
      </button>
      {!persistent && (
        <span
          aria-hidden
          style={{ animationDuration: `${durationMs}ms` }}
          className={cn(
            'absolute inset-x-0 bottom-0 h-1 origin-left animate-toast-countdown',
            'in-data-[expanded=true]:[animation-play-state:paused]',
            barClass,
          )}
        />
      )}
    </div>
  )
}

function show(tone: ToastTone, title: string, description?: string, action?: ToastAction) {
  const durationMs = action ? ACTION_TOAST_DURATION_MS : TOAST_DURATION_MS
  sonner.custom(
    (id) => (
      <ToastCard
        id={id}
        tone={tone}
        title={title}
        description={description}
        action={action}
        durationMs={durationMs}
      />
    ),
    { duration: durationMs },
  )
}

export const notify = {
  success: (title: string, description?: string, action?: ToastAction) =>
    show('success', title, description, action),
  error: (title: string, description?: string) => show('error', title, description),
  /**
   * Something was removed, with an Undo button on the right. Ctrl/Cmd+Z also undoes it while
   * the toast is up, unless the user is typing in a field.
   */
  removed: (title: string, description: string, onUndo: () => void) => {
    const undoKeys = (event: KeyboardEvent) => {
      const typing = event.target instanceof HTMLElement && event.target.closest('input, textarea')
      if (event.key.toLowerCase() !== 'z' || !(event.ctrlKey || event.metaKey) || typing) return
      event.preventDefault()
      sonner.dismiss(id)
      onUndo()
    }
    const stopListening = () => window.removeEventListener('keydown', undoKeys)
    const id = sonner.custom(
      (toastId) => (
        <ToastCard
          id={toastId}
          tone="removed"
          title={title}
          description={description}
          action={{
            label: t.common.undo,
            shortcut: `${MOD_KEY} Z`,
            onClick: () => {
              stopListening()
              onUndo()
            },
          }}
          durationMs={ACTION_TOAST_DURATION_MS}
        />
      ),
      { duration: ACTION_TOAST_DURATION_MS, onDismiss: stopListening, onAutoClose: stopListening },
    )
    window.addEventListener('keydown', undoKeys)
  },
  /** A message that waits for the user, with one action. Reusing `id` replaces it. */
  prompt: (id: string, title: string, description: string, action: ToastAction) =>
    sonner.custom(
      (toastId) => (
        <ToastCard
          id={toastId}
          tone="info"
          title={title}
          description={description}
          action={action}
          persistent
        />
      ),
      { id, duration: Infinity },
    ),
}

export function Toaster() {
  return <SonnerToaster position="bottom-right" duration={TOAST_DURATION_MS} gap={8} />
}
