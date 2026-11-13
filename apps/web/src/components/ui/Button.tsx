import { LoaderCircle } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Tooltip } from './Tooltip'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md'

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary-600 text-white shadow-xs hover:bg-primary-700 disabled:bg-primary-200',
  secondary:
    'bg-white text-gray-700 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:text-gray-400',
  ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:text-gray-300',
  danger: 'bg-red-600 text-white shadow-xs hover:bg-red-700 disabled:bg-red-300',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 px-2.5 text-xs',
  md: 'h-9 gap-2 px-3.5 text-sm',
}

type ButtonProps = ComponentProps<'button'> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

type IconButtonProps = Omit<ButtonProps, 'children' | 'aria-label'> & {
  label: string
  icon: ReactNode
}

/** Icon-only buttons always get a tooltip with their label, since there is no visible text. */
export function IconButton({ label, icon, className, size = 'md', ...props }: IconButtonProps) {
  return (
    <Tooltip content={label}>
      <Button
        aria-label={label}
        size={size}
        className={cn(size === 'sm' ? 'w-8 px-0' : 'w-9 px-0', className)}
        {...props}
      >
        {icon}
      </Button>
    </Tooltip>
  )
}
