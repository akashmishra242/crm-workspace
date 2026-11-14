import { Check, ChevronDown } from 'lucide-react'
import { Select as SelectPrimitive } from 'radix-ui'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type SelectOption<Value extends string> = {
  value: Value
  label: string
  /** Shown before the label, e.g. a colour dot. */
  icon?: ReactNode
}

type SelectProps<Value extends string> = {
  /** Accessible name; pair with a visible label where there is room. */
  label: string
  value: Value
  options: ReadonlyArray<SelectOption<Value>>
  onChange: (value: Value) => void
  size?: 'sm' | 'md'
  className?: string
  disabled?: boolean
  /** Runs when the list closes; call `event.preventDefault()` to move focus elsewhere. */
  onCloseAutoFocus?: (event: Event) => void
}

/** Shared trigger look for every field that opens a list: selects, multi-selects, pickers. */
export const fieldTriggerClasses =
  'inline-flex items-center justify-between gap-2 rounded-md bg-white px-3 text-left text-sm text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:outline-none data-[placeholder]:text-gray-400 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400'

export const listItemClasses =
  'relative flex h-8 cursor-default items-center gap-2 rounded px-2 text-sm text-gray-700 outline-none select-none data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900 data-[selected=true]:bg-gray-100 data-[selected=true]:text-gray-900 aria-disabled:text-gray-300'

/**
 * A styled, keyboard-accessible replacement for `<select>`, so lists look the same in every
 * browser and match the rest of the app.
 */
export function Select<Value extends string>({
  label,
  value,
  options,
  onChange,
  size = 'md',
  className,
  disabled,
  onCloseAutoFocus,
}: SelectProps<Value>) {
  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={(next) => onChange(next as Value)}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        aria-label={label}
        // Full width unless the caller sets a width.
        className={cn(
          fieldTriggerClasses,
          size === 'sm' ? 'h-8 text-xs' : 'h-9',
          className ?? 'w-full',
        )}
      >
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon>
          <ChevronDown className="size-4 text-gray-400" aria-hidden />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          onCloseAutoFocus={onCloseAutoFocus}
          className="z-50 max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) animate-fade-in overflow-hidden rounded-lg bg-white p-1 shadow-lg ring-1 ring-gray-200"
        >
          <SelectPrimitive.Viewport>
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className={cn(listItemClasses, 'pr-8')}
              >
                {option.icon}
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-2">
                  <Check className="size-4 text-primary-600" aria-hidden />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
