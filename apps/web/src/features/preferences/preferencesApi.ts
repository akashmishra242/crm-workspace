import type { PreferenceKey, PreferenceMap, StoredPreference } from '@crm/shared'
import { request } from '../../lib/http'

export function fetchPreferences(signal?: AbortSignal) {
  return request<PreferenceMap>('/me/preferences', { signal })
}

export function savePreference(
  key: PreferenceKey,
  write: StoredPreference,
  options: { keepalive: boolean; asUser: string },
) {
  return request<StoredPreference>(`/me/preferences/${key}`, {
    method: 'PUT',
    body: write,
    ...options,
  })
}
