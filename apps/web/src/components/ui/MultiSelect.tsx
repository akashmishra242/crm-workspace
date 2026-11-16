import { Command } from 'cmdk'
import { Check, ChevronDown, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { Popover, PopoverContent, PopoverTrigger } from './Popover'
import { fieldTriggerClasses, listItemClasses, type SelectOption } from './Select'

type MultiSelectProps<Value extends string> = {
  /** Accessible name of the trigger and the list. */
  label: string
  options: ReadonlyArray<SelectOption<Value>>
  value: readonly Value[]
  onChange: (value: Value[]) => void
  /** Shown on the trigger when nothing is selected. */
  placeholder: string
  searchPlaceholder?: string
  emptyMessage?: string
  status?: 'loading' | 'error'
  className?: string
  /**
   * Offers "Create …" when the search matches no option. Resolves with the new option's
   * value, which is then selected.
   */
  onCreate?: (name: string) => Promise<Value | undefined>
  createLabel?: (name: string) => string
}

/** A search box appears once the list is long enough to need one. */
const SEARCH_THRESHOLD = 6
const SUMMARY_NAMES = 2

/**
 * A dropdown of checkboxes. It scales to hundreds of options (search, scrolling list) where
 * an open list of checkboxes would not, and stays open while you tick several.
 */
export function MultiSelect<Value extends string>({
  label,
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder = t.common.searchEllipsis,
  emptyMessage = t.common.noMatches,
  status,
  className,
  onCreate,
  createLabel = t.common.createOption,
}: MultiSelectProps<Value>) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  // Creating waits on the server, and options ticked meanwhile must not be lost: after the
  // await, read the value as it is now, not as it was when "Create" was clicked.
  const latestValue = useRef(value)
  useEffect(() => {
    latestValue.current = value
  }, [value])
  const trimmed = search.trim()
  const canCreate =
    onCreate !== undefined &&
    trimmed !== '' &&
    !options.some((option) => option.label.toLowerCase() === trimmed.toLowerCase())

  async function create() {
    if (!onCreate || creating) return
    setCreating(true)
    try {
      const created = await onCreate(trimmed)
      const current = latestValue.current
      if (created !== undefined && !current.includes(created)) onChange([...current, created])
      setSearch('')
    } finally {
      setCreating(false)
    }
  }
  const selected = new Set(value)
  const selectedOptions = options.filter((option) => selected.has(option.value))
  const names = selectedOptions.slice(0, SUMMARY_NAMES).map((option) => option.label)
  const more = selectedOptions.length - names.length

  function toggle(optionValue: Value) {
    // Keeps the options' own order, so the saved value doesn't depend on click order.
    onChange(
      options
        .map((option) => option.value)
        .filter((item) => (item === optionValue ? !selected.has(item) : selected.has(item))),
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          data-placeholder={selectedOptions.length === 0 ? '' : undefined}
          className={cn(fieldTriggerClasses, 'h-9', className ?? 'w-full')}
        >
          <span className="truncate">
            {selectedOptions.length === 0
              ? placeholder
              : `${names.join(', ')}${more > 0 ? ` +${more}` : ''}`}
          </span>
          <ChevronDown className="size-4 shrink-0 text-gray-400" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-56 p-0">
        <Command label={label} loop>
          {(options.length > SEARCH_THRESHOLD || onCreate) && (
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder={searchPlaceholder}
              maxLength={60}
              className="h-10 w-full border-b border-gray-200 bg-transparent px-3 text-sm outline-none placeholder:text-gray-400"
            />
          )}
          <Command.List className="max-h-64 overflow-y-auto p-1">
            {status === 'loading' && <Command.Loading>{t.common.loadingEllipsis}</Command.Loading>}
            {status === 'error' && (
              <p className="px-2 py-3 text-sm text-red-600">{t.common.optionsLoadFailed}</p>
            )}
            {!canCreate && (
              <Command.Empty className="px-2 py-3 text-sm text-gray-500">
                {emptyMessage}
              </Command.Empty>
            )}
            {options.map((option) => {
              const checked = selected.has(option.value)
              return (
                <Command.Item
                  key={option.value}
                  value={`${option.label} ${option.value}`}
                  onSelect={() => toggle(option.value)}
                  aria-checked={checked}
                  className={listItemClasses}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'grid size-4 shrink-0 place-items-center rounded border',
                      checked
                        ? 'border-primary-600 bg-primary-600 text-white'
                        : 'border-gray-300 bg-white',
                    )}
                  >
                    {checked && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  {option.icon}
                  <span className="truncate">{option.label}</span>
                </Command.Item>
              )
            })}
            {canCreate && (
              <Command.Item
                forceMount
                value={`create ${trimmed}`}
                onSelect={() => void create()}
                disabled={creating}
                className={cn(listItemClasses, 'text-primary-700')}
              >
                <Plus className="size-4" aria-hidden />
                <span className="truncate">{createLabel(trimmed)}</span>
              </Command.Item>
            )}
          </Command.List>
        </Command>
        <div className="flex items-center justify-between border-t border-gray-200 px-3 py-2 text-xs text-gray-500">
          <span>{t.common.selected(selectedOptions.length)}</span>
          <button
            type="button"
            disabled={selectedOptions.length === 0}
            onClick={() => onChange([])}
            className="font-medium text-primary-700 hover:underline disabled:cursor-not-allowed disabled:text-gray-300 disabled:no-underline"
          >
            {t.common.clear}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
