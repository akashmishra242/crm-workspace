import { z } from 'zod'
import { usePreference } from '../preferences/usePreference'

/** Each key has its own default, so settings added later don't reset the saved ones. */
const appSettingsSchema = z.object({
  preloadOnHover: z.boolean().default(false),
})
export type AppSettings = z.infer<typeof appSettingsSchema>

const DEFAULT_SETTINGS: AppSettings = { preloadOnHover: false }

/** Per-teammate settings, synced like every other preference. */
export function useAppSettings() {
  const [settings, setSettings] = usePreference('app.settings', appSettingsSchema, DEFAULT_SETTINGS)
  return {
    settings,
    setPreloadOnHover: (preloadOnHover: boolean) =>
      setSettings((current) => ({ ...current, preloadOnHover })),
  }
}
