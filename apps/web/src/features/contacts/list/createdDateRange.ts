export const DATE_PRESETS = [
  { id: 'any', label: 'Any time', days: null },
  { id: 'today', label: 'Today', days: 1 },
  { id: 'last7', label: 'Last 7 days', days: 7 },
  { id: 'last30', label: 'Last 30 days', days: 30 },
  { id: 'last90', label: 'Last 90 days', days: 90 },
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

const dayFormat = new Intl.DateTimeFormat('en-US', {
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
  if (createdFrom && createdTo) return `${dayLabel(createdFrom)} – ${dayLabel(createdTo)}`
  if (createdFrom) return `Since ${dayLabel(createdFrom)}`
  if (createdTo) return `Until ${dayLabel(createdTo)}`
  return 'Any time'
}
