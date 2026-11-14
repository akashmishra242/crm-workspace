import { AlertTriangle, RotateCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { Button } from './Button'

export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cn('block animate-pulse rounded bg-gray-200', className)} />
}

type EmptyStateProps = {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <span className="mb-3 grid size-12 place-items-center rounded-full bg-gray-100 text-gray-500">
        {icon}
      </span>
      <p className="font-medium text-gray-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-gray-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

type ErrorStateProps = {
  title?: string
  message: string
  onRetry?: () => void
  retryLabel?: string
  retrying?: boolean
}

export function ErrorState({
  title = t.states.errorTitle,
  message,
  onRetry,
  retryLabel = t.common.tryAgain,
  retrying = false,
}: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-16 text-center">
      <span className="mb-3 grid size-12 place-items-center rounded-full bg-red-50 text-red-600">
        <AlertTriangle className="size-5" aria-hidden />
      </span>
      <p className="font-medium text-gray-900">{title}</p>
      <p className="mt-1 max-w-sm text-gray-500">{message}</p>
      {onRetry && (
        <Button className="mt-4" onClick={onRetry} loading={retrying}>
          {!retrying && <RotateCw className="size-4" aria-hidden />}
          {retryLabel}
        </Button>
      )}
    </div>
  )
}
