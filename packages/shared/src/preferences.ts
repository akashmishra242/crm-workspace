import { z } from 'zod'

/** UI preferences that follow the user across devices. */
export const PREFERENCE_KEYS = [
  'contacts.columns',
  'contacts.pageSize',
  'contacts.detailView',
  'contacts.detailPanel',
  'app.settings',
] as const
export type PreferenceKey = (typeof PREFERENCE_KEYS)[number]

const MAX_PREFERENCE_BYTES = 8_192
const CLOCK_SKEW_ALLOWANCE_MS = 5 * 60_000

export type StoredPreference = {
  value: unknown
  /** When the value was changed on the client that wrote it; the newest write wins. */
  updatedAt: string
}

export type PreferenceMap = Partial<Record<PreferenceKey, StoredPreference>>

export const preferenceWriteSchema = z.object({
  value: z
    .json()
    .refine(
      (value) => JSON.stringify(value).length <= MAX_PREFERENCE_BYTES,
      'Preference is too large',
    ),
  // A device with a clock far ahead would otherwise win every later write.
  updatedAt: z.iso
    .datetime()
    .refine(
      (value) => Date.parse(value) <= Date.now() + CLOCK_SKEW_ALLOWANCE_MS,
      'Timestamp is in the future',
    ),
})
export type PreferenceWrite = z.infer<typeof preferenceWriteSchema>
