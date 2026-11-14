import { LOCALE, t } from '../../../i18n'

const PRESET_LABELS = t.contacts.filters.datePresets

export const DATE_PRESETS = [
  { id: 'any', label: PRESET_LABELS.any, days: null },
  { id: 'today', label: PRESET_LABELS.today, days: 1 },
  { id: 'last7', label: PRESET_LABELS.last7, days: 7 },
  { id: 'last30', label: PRESET_LABELS.last30, days: 30 },
  { id: 'last90', label: PRESET_LABELS.last90, days: 90 },
] as const

export type DatePresetId = (typeof DATE_PRESETS)[number]['id'] | 'custom'

type DateRange = { createdFrom: string | null; createdTo: string | null }

/** Days are UTC calendar days end to end (URL, presets and API), so they always agree. */
const toUtcDay = (date: Date) => date.toISOString().slice(0, 10)

function daysAgo(days: number, today: Date): string {
  const date = new Date(today)
  date.setUTCDate(date.getUTCDate() - days)
  return toUtcDay(date)
}

export function presetRange(presetId: DatePresetId, today = new Date()): DateRange {
  const preset = DATE_PRESETS.find((item) => item.id === presetId)
  if (!preset?.days) return { createdFrom: null, createdTo: null }
  return { createdFrom: daysAgo(preset.days - 1, today), createdTo: null }
}

export function matchPreset(range: DateRange, today = new Date()): DatePresetId {
  const match = DATE_PRESETS.find((preset) => {
    const candidate = presetRange(preset.id, today)
    return candidate.createdFrom === range.createdFrom && candidate.createdTo === range.createdTo
  })
  return match?.id ?? 'custom'
}

const dayFormat = new Intl.DateTimeFormat(LOCALE, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})
const dayLabel = (day: string) => dayFormat.format(new Date(`${day}T00:00:00Z`))

export function describeDateRange(range: DateRange, today = new Date()): string {
  const preset = matchPreset(range, today)
  if (preset !== 'custom') {
    return DATE_PRESETS.find((item) => item.id === preset)?.label ?? ''
  }
  const { createdFrom, createdTo } = range
  if (createdFrom && createdTo) {
    return t.contacts.filters.dateRange(dayLabel(createdFrom), dayLabel(createdTo))
  }
  if (createdFrom) return t.contacts.filters.since(dayLabel(createdFrom))
  if (createdTo) return t.contacts.filters.until(dayLabel(createdTo))
  return PRESET_LABELS.any
}
