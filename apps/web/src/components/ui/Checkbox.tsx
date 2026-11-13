import { Check, Minus } from 'lucide-react'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'

type CheckboxProps = ComponentProps<typeof CheckboxPrimitive.Root>

export function Checkbox({ className, checked, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      checked={checked}
      className={cn(
        'grid size-4 shrink-0 place-items-center rounded border border-gray-300 bg-white text-white transition-colors',
        'data-[state=checked]:border-primary-600 data-[state=checked]:bg-primary-600',
        'data-[state=indeterminate]:border-primary-600 data-[state=indeterminate]:bg-primary-600',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator>
        {checked === 'indeterminate' ? (
          <Minus className="size-3" strokeWidth={3} aria-hidden />
        ) : (
          <Check className="size-3" strokeWidth={3} aria-hidden />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}
