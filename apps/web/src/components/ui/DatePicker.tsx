import { CalendarDays } from 'lucide-react'
import { useState, type ChangeEvent, type CSSProperties } from 'react'
import { DayPicker, type DropdownProps, type Matcher } from 'react-day-picker'
import 'react-day-picker/style.css'
import { LOCALE, t } from '../../i18n'
import { cn } from '../../lib/cn'
import { Button } from './Button'
import { Popover, PopoverContent, PopoverTrigger } from './Popover'
import { fieldTriggerClasses, Select } from './Select'

/** Calendar days as `YYYY-MM-DD`, the same form the URL and the API use. */
type Day = string

/** How far back the year menu goes; older contact data is rare in a CRM. */
const EARLIEST_YEAR = 2010

// A day is a calendar date, not an instant: local dates keep the day number from shifting.
function toDate(day: Day): Date {
  const [year = 1970, month = 1, date = 1] = day.split('-').map(Number)
  return new Date(year, month - 1, date)
}

function toDay(date: Date): Day {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const dayFormat = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const calendarTheme = {
  '--rdp-accent-color': 'var(--color-primary-600)',
  '--rdp-accent-background-color': 'var(--color-primary-50)',
  '--rdp-day-height': '2.25rem',
  '--rdp-day-width': '2.25rem',
  '--rdp-day_button-height': '2.125rem',
  '--rdp-day_button-width': '2.125rem',
} as CSSProperties

/** The calendar's month and year menus, drawn with the app's own Select. */
function CalendarDropdown({ options = [], value, onChange, ...props }: DropdownProps) {
  return (
    <Select
      size="sm"
      label={props['aria-label'] ?? ''}
      className="w-auto min-w-[5.5rem]"
      value={String(value)}
      options={options
        .filter((option) => !option.disabled)
        .map((option) => ({ value: String(option.value), label: option.label }))}
      onChange={(next) =>
        onChange?.({ target: { value: next } } as unknown as ChangeEvent<HTMLSelectElement>)
      }
    />
  )
}

type DatePickerProps = {
  label: string
  value: Day | null
  onChange: (day: Day | null) => void
  placeholder: string
  /** Earliest and latest days that can be picked; never later than today. */
  min?: Day | null
  max?: Day | null
  /**
   * The day the Today button picks and the last day on offer. Defaults to the local date;
   * callers whose days are UTC days pass the UTC date so both agree.
   */
  today?: Day
}

/**
 * One date in a popover calendar. Month and year menus jump straight to any month since
 * 2010, so a long range is two quick picks rather than paging through a calendar.
 */
export function DatePicker({
  label,
  value,
  onChange,
  placeholder,
  min,
  max,
  today,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const todayDay = today ?? toDay(new Date())
  const latest = toDate(max ?? todayDay)
  const earliest = min ? toDate(min) : undefined
  const disabled: Matcher[] = [{ after: latest }, ...(earliest ? [{ before: earliest }] : [])]
  const todayAllowed = (!min || todayDay >= min) && (!max || todayDay <= max)

  function pick(day: Day | null) {
    onChange(day)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          data-placeholder={value ? undefined : ''}
          className={cn(fieldTriggerClasses, 'h-9 w-full')}
        >
          <span className="truncate">{value ? dayFormat.format(toDate(value)) : placeholder}</span>
          <CalendarDays className="size-4 shrink-0 text-gray-400" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-3 text-sm">
        <DayPicker
          mode="single"
          selected={value ? toDate(value) : undefined}
          onSelect={(date) => pick(date ? toDay(date) : null)}
          defaultMonth={value ? toDate(value) : latest}
          captionLayout="dropdown"
          // The menus only offer months that can hold a valid pick.
          startMonth={earliest ?? new Date(EARLIEST_YEAR, 0)}
          endMonth={latest}
          disabled={disabled}
          components={{ Dropdown: CalendarDropdown }}
          style={calendarTheme}
        />
        <div className="mt-2 flex justify-between border-t border-gray-200 pt-2">
          <Button size="sm" variant="ghost" disabled={!value} onClick={() => pick(null)}>
            {t.common.clear}
          </Button>
          <Button size="sm" disabled={!todayAllowed} onClick={() => pick(todayDay)}>
            {t.common.today}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
