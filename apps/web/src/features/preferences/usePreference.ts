import type { PreferenceKey } from '@crm/shared'
import { useMemo, useSyncExternalStore } from 'react'
import type { z } from 'zod'
import { preferenceStore } from './preferenceStore'

/**
 * Reads a synced preference. Values are validated on read, so data saved by an older
 * version of the app, or edited elsewhere, falls back to the default instead of crashing.
 */
export function usePreference<T>(key: PreferenceKey, schema: z.ZodType<T>, fallback: T) {
  const raw = useSyncExternalStore(preferenceStore.subscribe, () => preferenceStore.get(key))
  const value = useMemo(() => {
    const parsed = schema.safeParse(raw)
    return parsed.success ? parsed.data : fallback
  }, [raw, schema, fallback])

  const setValue = (next: T | ((current: T) => T)) =>
    preferenceStore.set(key, next instanceof Function ? next(value) : next)

  return [value, setValue] as const
}
