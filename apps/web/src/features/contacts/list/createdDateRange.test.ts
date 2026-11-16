import { describe, expect, it } from 'vitest'
import { describeDateRange, matchPreset, presetRange, utcToday } from './createdDateRange'

const today = new Date('2026-11-14T22:30:00Z')

describe('created date ranges', () => {
  it('counts today as the first day of a preset', () => {
    expect(presetRange('today', today)).toEqual({ createdFrom: '2026-11-14', createdTo: null })
    expect(presetRange('last7', today)).toEqual({ createdFrom: '2026-11-08', createdTo: null })
    expect(presetRange('any', today)).toEqual({ createdFrom: null, createdTo: null })
  })

  it('gives the date pickers the same "today" as the presets, even when local dates differ', () => {
    // 22:30 UTC on the 14th is already the 15th in India; the filter's day is still the 14th.
    expect(utcToday(today)).toBe('2026-11-14')
    expect(presetRange('today', today).createdFrom).toBe(utcToday(today))
  })

  it('recognises a preset in the URL and treats anything else as custom', () => {
    expect(matchPreset({ createdFrom: '2026-11-08', createdTo: null }, today)).toBe('last7')
    expect(matchPreset({ createdFrom: '2026-11-01', createdTo: '2026-11-03' }, today)).toBe(
      'custom',
    )
  })

  it('labels the range for the filter chip', () => {
    expect(describeDateRange({ createdFrom: '2026-10-16', createdTo: null }, today)).toBe(
      'Last 30 days',
    )
    expect(describeDateRange({ createdFrom: '2026-11-01', createdTo: '2026-11-03' }, today)).toBe(
      'Nov 1, 2026 – Nov 3, 2026',
    )
    expect(describeDateRange({ createdFrom: null, createdTo: '2026-11-03' }, today)).toBe(
      'Until Nov 3, 2026',
    )
  })
})
