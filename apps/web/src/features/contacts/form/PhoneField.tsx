import {
  callingCode,
  formatNationalAsYouType,
  isPhoneCountry,
  joinPhone,
  PHONE_COUNTRIES,
  splitPhone,
  type CountryCode,
} from '@crm/shared'
import { Command } from 'cmdk'
import { Check, ChevronDown } from 'lucide-react'
import { useId, useState, type Ref } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/Popover'
import { listItemClasses } from '../../../components/ui/Select'
import { inputClasses } from '../../../components/ui/TextField'
import { LOCALE, t } from '../../../i18n'
import { cn } from '../../../lib/cn'

const regionNames = new Intl.DisplayNames([LOCALE], { type: 'region' })
const countryName = (country: CountryCode) => regionNames.of(country) ?? country

const COUNTRY_OPTIONS = PHONE_COUNTRIES.map((country) => ({
  country,
  name: countryName(country),
  code: callingCode(country),
})).sort((a, b) => a.name.localeCompare(b.name, LOCALE))

const LAST_COUNTRY_KEY = 'crm.phoneCountry'

/** Time zones of the places this team works with most. The browser has no zone→country API. */
const ZONE_COUNTRIES: Record<string, CountryCode> = {
  'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN',
  'Europe/London': 'GB',
  'Europe/Dublin': 'IE',
  'Europe/Berlin': 'DE',
  'Europe/Paris': 'FR',
  'Europe/Madrid': 'ES',
  'Europe/Amsterdam': 'NL',
  'Asia/Dubai': 'AE',
  'Asia/Singapore': 'SG',
  'Asia/Tokyo': 'JP',
  'Australia/Sydney': 'AU',
  'Australia/Melbourne': 'AU',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'America/Mexico_City': 'MX',
  'America/Sao_Paulo': 'BR',
}

/**
 * The country to start from: the one picked last time, else the time zone (many people in
 * India browse with en-US, so the language alone says "US"), else the language's region.
 */
function defaultCountry(): CountryCode {
  try {
    const last = localStorage.getItem(LAST_COUNTRY_KEY)
    if (last && isPhoneCountry(last)) return last
  } catch {
    // Storage blocked: fall through to the other hints.
  }
  const zone = ZONE_COUNTRIES[Intl.DateTimeFormat().resolvedOptions().timeZone]
  if (zone) return zone
  for (const language of navigator.languages ?? [navigator.language]) {
    const region = new Intl.Locale(language).maximize().region
    if (region && isPhoneCountry(region)) return region
  }
  return 'US'
}

function rememberCountry(country: CountryCode) {
  try {
    localStorage.setItem(LAST_COUNTRY_KEY, country)
  } catch {
    // Not remembered; the next form starts from the other hints.
  }
}

type PhoneFieldProps = {
  label: string
  /** The form value: "+91 98765 43210", or empty. */
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  name: string
  error?: string
  inputRef?: Ref<HTMLInputElement>
}

/**
 * A country code picker beside the number, so nobody has to know to type "+91". The value
 * stays one international string, which the shared schema turns into E.164.
 */
export function PhoneField({
  label,
  value,
  onChange,
  onBlur,
  name,
  error,
  inputRef,
}: PhoneFieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const [initial] = useState(() => splitPhone(value, defaultCountry()))
  const [country, setCountry] = useState<CountryCode>(initial.country)
  const [national, setNational] = useState(initial.national)
  const [open, setOpen] = useState(false)
  // The last value this field produced. A different value means the form changed it
  // (Discard, a reset after saving), so the picker and the box follow it.
  const [shown, setShown] = useState(value)
  if (value !== shown) {
    const next = splitPhone(value, country)
    setCountry(next.country)
    setNational(next.national)
    setShown(value)
  }

  function emit(nextCountry: CountryCode, nextNational: string) {
    const joined = joinPhone(nextCountry, nextNational)
    setCountry(nextCountry)
    setNational(nextNational)
    setShown(joined)
    onChange(joined)
  }

  function changeNational(next: string) {
    // A full international number pasted in picks its own country.
    if (next.trim().startsWith('+')) {
      const pasted = splitPhone(next, country)
      emit(pasted.country, pasted.national)
      return
    }
    // Format only while typing forwards, so deleting a space or bracket isn't undone.
    emit(country, next.length > national.length ? formatNationalAsYouType(country, next) : next)
  }

  function chooseCountry(next: CountryCode) {
    setOpen(false)
    rememberCountry(next)
    if (national.trim() === '') setCountry(next)
    else emit(next, national)
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-gray-600">
        {label}
      </label>
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={`${t.contacts.form.phoneCountry}: ${countryName(country)} ${callingCode(country)}`}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-white px-2.5 text-sm text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:outline-none"
            >
              <span className="rounded bg-gray-100 px-1 text-[11px] font-semibold text-gray-600">
                {country}
              </span>
              <span className="tabular-nums">{callingCode(country)}</span>
              <ChevronDown className="size-3.5 text-gray-400" aria-hidden />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0">
            <Command label={t.contacts.form.phoneCountry} loop>
              <Command.Input
                placeholder={t.contacts.form.searchCountry}
                maxLength={40}
                className="h-10 w-full border-b border-gray-200 bg-transparent px-3 text-sm outline-none placeholder:text-gray-400"
              />
              <Command.List className="max-h-64 overflow-y-auto p-1">
                <Command.Empty className="px-2 py-3 text-sm text-gray-500">
                  {t.contacts.form.noCountry}
                </Command.Empty>
                {COUNTRY_OPTIONS.map((option) => (
                  <Command.Item
                    key={option.country}
                    // Searchable by name, ISO code and dial code: "india", "IN", "+91", "91".
                    value={`${option.name} ${option.country} ${option.code} ${option.code.slice(1)}`}
                    onSelect={() => chooseCountry(option.country)}
                    className={cn(listItemClasses, 'pr-8')}
                  >
                    <span className="w-7 text-[11px] font-semibold text-gray-500">
                      {option.country}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{option.name}</span>
                    <span className="text-gray-500 tabular-nums">{option.code}</span>
                    {option.country === country && (
                      <Check className="absolute right-2 size-4 text-primary-600" aria-hidden />
                    )}
                  </Command.Item>
                ))}
              </Command.List>
            </Command>
          </PopoverContent>
        </Popover>
        <input
          id={id}
          ref={inputRef}
          name={name}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={t.contacts.form.placeholders.phone}
          value={national}
          onChange={(event) => changeNational(event.target.value)}
          onBlur={onBlur}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={inputClasses}
        />
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
