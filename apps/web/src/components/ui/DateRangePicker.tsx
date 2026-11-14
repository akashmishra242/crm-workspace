import { CalendarDays } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { DayPicker, type DateRange } from 'react-day-picker'
import 'react-day-picker/style.css'
import { t } from '../../i18n'
import { cn } from '../../lib/cn'
import { Button } from './Button'
import { Popover, PopoverContent, PopoverTrigger } from './Popover'
import { fieldTriggerClasses } from './Select'

/** Calendar days as `YYYY-MM-DD`, the same form the URL and the API use. */
export type DayRange = { from: string | null; to: string | null }

type DateRangePickerProps = {
  label: string
  value: DayRange
  onChange: (range: DayRange) => void
  placeholder?: string
  /** Formats the chosen range for the trigger. */
  describe: (range: DayRange) => string
  invalid?: boolean
}

// A day is a calendar date, not an instant: local dates keep the day number from shifting.
function toDate(day: string | null): Date | undefined {
  if (!day) return undefined
  const [year = 1970, month = 1, date = 1] = day.split('-').map(Number)
  return new Date(year, month - 1, date)
}

function toDay(date: Date | undefined): string | null {
  if (!date) return null
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const calendarTheme = {
  '--rdp-accent-color': 'var(--color-primary-600)',
  '--rdp-accent-background-color': 'var(--color-primary-50)',
  '--rdp-day-height': '2.25rem',
  '--rdp-day-width': '2.25rem',
  '--rdp-day_button-height': '2.125rem',
  '--rdp-day_button-width': '2.125rem',
} as CSSProperties

/** A calendar in a popover. Pick the start day, then the end day. */
export function DateRangePicker({
  label,
  value,
  onChange,
  placeholder = t.common.pickDates,
  describe,
  invalid = false,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const selected: DateRange | undefined = value.from
    ? { from: toDate(value.from), to: toDate(value.to) }
    : undefined
  const isEmpty = !value.from && !value.to

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          data-invalid={invalid || undefined}
          data-placeholder={isEmpty ? '' : undefined}
          className={cn(fieldTriggerClasses, 'h-9 w-full data-[invalid]:ring-red-400')}
        >
          <span className="truncate">{isEmpty ? placeholder : describe(value)}</span>
          <CalendarDays className="size-4 shrink-0 text-gray-400" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-3 text-sm">
        <DayPicker
          mode="range"
          selected={selected}
          onSelect={(range) => onChange({ from: toDay(range?.from), to: toDay(range?.to) })}
          defaultMonth={selected?.from ?? new Date()}
          // Contacts can't have been created in the future.
          disabled={{ after: new Date() }}
          style={calendarTheme}
        />
        <div className="mt-2 flex justify-between border-t border-gray-200 pt-2">
          <Button
            size="sm"
            variant="ghost"
            disabled={isEmpty}
            onClick={() => onChange({ from: null, to: null })}
          >
            {t.common.clear}
          </Button>
          <Button size="sm" variant="primary" onClick={() => setOpen(false)}>
            {t.common.done}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
