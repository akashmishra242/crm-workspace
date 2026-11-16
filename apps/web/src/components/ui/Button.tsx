import { LoaderCircle } from 'lucide-react'
import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Tooltip } from './Tooltip'

type ButtonVariant =
  | 'primary'
  | 'secondary'
  /** A secondary button showing that something is on, e.g. filters are applied. */
  | 'selected'
  | 'ghost'
  | 'ghostPrimary'
  | 'ghostDanger'
  | 'danger'
type ButtonSize = 'sm' | 'md'

// Each variant sets every color it needs, so callers never override colors through className
// (see `cn`): a new look is a new variant.
const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary-600 text-white shadow-xs hover:bg-primary-700 disabled:bg-primary-200',
  secondary:
    'bg-white text-gray-700 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:text-gray-400',
  selected:
    'bg-primary-50 text-primary-700 shadow-xs ring-1 ring-inset ring-primary-200 hover:bg-primary-100 disabled:text-gray-400',
  ghost: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:text-gray-300',
  ghostPrimary: 'text-primary-700 hover:bg-primary-50 disabled:text-gray-300',
  ghostDanger: 'text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:text-gray-300',
  danger: 'bg-red-600 text-white shadow-xs hover:bg-red-700 disabled:bg-red-300',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 text-xs',
  md: 'h-9 gap-2 text-sm',
}

const paddingClasses: Record<ButtonSize, string> = { sm: 'px-2.5', md: 'px-3.5' }
const squareClasses: Record<ButtonSize, string> = { sm: 'w-8', md: 'w-9' }

type ButtonProps = ComponentProps<'button'> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  /** Icon only: as wide as it is tall, with no side padding. */
  square?: boolean
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  square = false,
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
        square ? squareClasses[size] : paddingClasses[size],
        className,
      )}
      {...props}
    >
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

type IconButtonProps = Omit<ButtonProps, 'children' | 'aria-label' | 'square'> & {
  label: string
  icon: ReactNode
  /** Why the button is disabled; shown instead of the label while it is. */
  disabledReason?: string
}

/** Icon-only buttons always get a tooltip with their label, since there is no visible text. */
export function IconButton({
  label,
  icon,
  size = 'md',
  disabledReason,
  ...props
}: IconButtonProps) {
  const reasonId = useId()
  const reason = props.disabled ? disabledReason : undefined

  if (reason) {
    // A disabled button gets no pointer events, so the tooltip hangs on a wrapper instead,
    // and screen readers hear the reason as the button's description.
    return (
      <Tooltip content={reason}>
        <span className="inline-flex">
          <Button aria-label={label} aria-describedby={reasonId} size={size} square {...props}>
            {icon}
          </Button>
          <span id={reasonId} className="sr-only">
            {reason}
          </span>
        </span>
      </Tooltip>
    )
  }

  return (
    <Tooltip content={label}>
      <Button aria-label={label} size={size} square {...props}>
        {icon}
      </Button>
    </Tooltip>
  )
}
