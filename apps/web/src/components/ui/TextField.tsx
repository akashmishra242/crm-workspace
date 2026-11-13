import { useId, type ComponentProps } from 'react'
import { cn } from '../../lib/cn'

export const inputClasses =
  'block h-9 w-full rounded-md border-0 bg-white px-3 text-sm text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-primary-600 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500 aria-invalid:ring-red-400 aria-invalid:focus:ring-red-500'

type TextFieldProps = ComponentProps<'input'> & {
  label: string
  error?: string
  /** Visually hides the label while keeping it available to assistive technology. */
  hideLabel?: boolean
}

export function TextField({
  label,
  error,
  hideLabel = false,
  className,
  id,
  ...inputProps
}: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`

  return (
    <div className={className}>
      <label
        htmlFor={inputId}
        className={cn('mb-1 block text-xs font-medium text-gray-600', hideLabel && 'sr-only')}
      >
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={inputClasses}
        {...inputProps}
      />
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
