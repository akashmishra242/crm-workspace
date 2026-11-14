import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { toast as sonner, Toaster as SonnerToaster } from 'sonner'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'

const TOAST_DURATION_MS = 5_000

type ToastTone = 'success' | 'error' | 'info'

const TONES: Record<ToastTone, { icon: typeof CircleCheck; iconClass: string; barClass: string }> =
  {
    success: { icon: CircleCheck, iconClass: 'text-emerald-600', barClass: 'bg-emerald-500' },
    error: { icon: CircleAlert, iconClass: 'text-red-600', barClass: 'bg-red-500' },
    info: { icon: Info, iconClass: 'text-primary-600', barClass: 'bg-primary-500' },
  }

type ToastAction = { label: string; onClick: () => void }

type ToastCardProps = {
  id: string | number
  tone: ToastTone
  title: string
  description?: string
  action?: ToastAction
  /** Stays until acted on or dismissed, so there is no countdown bar. */
  persistent?: boolean
}

/**
 * One toast design for the whole app: icon, message, close button and a bar that counts
 * down the time left. Sonner pauses the timer while the toasts are hovered, and the bar
 * pauses with it (Sonner marks hovered toasts with `data-expanded`).
 */
function ToastCard({ id, tone, title, description, action, persistent }: ToastCardProps) {
  const { icon: Icon, iconClass, barClass } = TONES[tone]
  return (
    <div className="relative flex w-[356px] max-w-[calc(100vw-2rem)] gap-3 overflow-hidden rounded-lg bg-white p-4 pb-5 shadow-lg ring-1 ring-gray-200">
      <Icon className={cn('mt-0.5 size-5 shrink-0', iconClass)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        {description && <p className="mt-0.5 text-sm text-gray-600">{description}</p>}
        {action && (
          <button
            type="button"
            onClick={() => {
              sonner.dismiss(id)
              action.onClick()
            }}
            className="mt-2 text-sm font-medium text-primary-700 hover:underline"
          >
            {action.label}
          </button>
        )}
      </div>
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
          style={{ animationDuration: `${TOAST_DURATION_MS}ms` }}
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

function show(tone: ToastTone, title: string, description?: string) {
  sonner.custom((id) => <ToastCard id={id} tone={tone} title={title} description={description} />)
}

export const notify = {
  success: (title: string, description?: string) => show('success', title, description),
  error: (title: string, description?: string) => show('error', title, description),
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
