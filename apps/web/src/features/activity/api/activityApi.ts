import type { ActivityPage } from '@crm/shared'
import { request, toSearchParams } from '../../../lib/http'

export function fetchActivity(contactId: string, cursor: string | null, signal?: AbortSignal) {
  return request<ActivityPage>(`/contacts/${contactId}/activities${toSearchParams({ cursor })}`, {
    signal,
  })
}
