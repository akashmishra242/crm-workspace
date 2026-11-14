import { Check } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'

export const Menu = DropdownMenu.Root
export const MenuTrigger = DropdownMenu.Trigger
export const MenuRadioGroup = DropdownMenu.RadioGroup

const itemClasses =
  'relative flex h-8 cursor-default items-center gap-2 rounded px-2 text-sm text-gray-700 outline-none select-none data-[highlighted]:bg-gray-100 data-[highlighted]:text-gray-900 data-[disabled]:text-gray-300'

export function MenuContent({
  className,
  align = 'start',
  sideOffset = 4,
  ...props
}: ComponentProps<typeof DropdownMenu.Content>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-48 animate-fade-in rounded-lg bg-white p-1 shadow-lg ring-1 ring-gray-200',
          className,
        )}
        {...props}
      />
    </DropdownMenu.Portal>
  )
}

export function MenuRadioItem({
  className,
  children,
  ...props
}: ComponentProps<typeof DropdownMenu.RadioItem>) {
  return (
    <DropdownMenu.RadioItem className={cn(itemClasses, 'pl-7', className)} {...props}>
      <DropdownMenu.ItemIndicator className="absolute left-2">
        <Check className="size-4 text-primary-600" aria-hidden />
      </DropdownMenu.ItemIndicator>
      {children}
    </DropdownMenu.RadioItem>
  )
}

export function MenuLabel({ className, ...props }: ComponentProps<typeof DropdownMenu.Label>) {
  return (
    <DropdownMenu.Label
      className={cn('px-2 pt-2 pb-1 text-xs font-medium text-gray-500', className)}
      {...props}
    />
  )
}

export function MenuItem({ className, ...props }: ComponentProps<typeof DropdownMenu.Item>) {
  return <DropdownMenu.Item className={cn(itemClasses, className)} {...props} />
}

export function MenuSeparator() {
  return <DropdownMenu.Separator className="my-1 h-px bg-gray-200" />
}
