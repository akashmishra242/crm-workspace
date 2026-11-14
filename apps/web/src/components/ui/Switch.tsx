import { Switch as SwitchPrimitive } from 'radix-ui'
import { useId, type ReactNode } from 'react'

type SwitchProps = {
  label: string
  description?: ReactNode
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
}

/** On/off settings. Lists of choices use checkboxes; a single setting uses a switch. */
export function Switch({ label, description, checked, onCheckedChange, disabled }: SwitchProps) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-gray-800">
          {label}
        </label>
        {description && (
          <p id={`${id}-description`} className="mt-0.5 text-xs text-gray-500">
            {description}
          </p>
        )}
      </div>
      <SwitchPrimitive.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-describedby={description ? `${id}-description` : undefined}
        className="relative mt-0.5 h-5 w-9 shrink-0 rounded-full bg-gray-300 transition-colors data-[state=checked]:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <SwitchPrimitive.Thumb className="block size-4 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-[18px]" />
      </SwitchPrimitive.Root>
    </div>
  )
}
