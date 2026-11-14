import { LOCALE, t } from '../i18n'

export { formatPhone } from '@crm/shared'

const dateTimeFormat = new Intl.DateTimeFormat(LOCALE, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const dateFormat = new Intl.DateTimeFormat(LOCALE, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

const timeFormat = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' })

const numberFormat = new Intl.NumberFormat(LOCALE)

const relativeFormat = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' })

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 60 * 60],
  ['month', 30 * 24 * 60 * 60],
  ['week', 7 * 24 * 60 * 60],
  ['day', 24 * 60 * 60],
  ['hour', 60 * 60],
  ['minute', 60],
]

export const formatDateTime = (iso: string) => dateTimeFormat.format(new Date(iso))
export const formatDate = (iso: string) => dateFormat.format(new Date(iso))
export const formatTime = (iso: string) => timeFormat.format(new Date(iso))
export const formatCount = (value: number) => numberFormat.format(value)

/** The viewer's own UTC offset, e.g. "GMT+5:30", shown wherever times are listed. */
export const timeZoneLabel =
  new Intl.DateTimeFormat(LOCALE, { timeZoneName: 'shortOffset' })
    .formatToParts(new Date())
    .find((part) => part.type === 'timeZoneName')?.value ?? t.format.localTime

export function formatRelative(iso: string, now: Date = new Date()): string {
  const seconds = (new Date(iso).getTime() - now.getTime()) / 1000
  for (const [unit, unitSeconds] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= unitSeconds) {
      return relativeFormat.format(Math.round(seconds / unitSeconds), unit)
    }
  }
  return t.format.justNow
}

export function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatCount(count)} ${count === 1 ? singular : plural}`
}
