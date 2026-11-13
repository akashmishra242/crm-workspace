import type { BulkTagInput, BulkTagResult, Tag, TagCreateInput } from '@crm/shared'
import { request } from '../../../lib/http'

export function fetchTags(signal?: AbortSignal) {
  return request<Tag[]>('/tags', { signal })
}

export function createTag(input: TagCreateInput) {
  return request<Tag>('/tags', { method: 'POST', body: input })
}

export function addContactTag(contactId: string, tagId: string) {
  return request<Tag[]>(`/contacts/${contactId}/tags`, { method: 'POST', body: { tagId } })
}

export function removeContactTag(contactId: string, tagId: string) {
  return request<Tag[]>(`/contacts/${contactId}/tags/${tagId}`, { method: 'DELETE' })
}

export function bulkUpdateTags(input: BulkTagInput) {
  return request<BulkTagResult>('/contacts/bulk/tags', { method: 'POST', body: input })
}
