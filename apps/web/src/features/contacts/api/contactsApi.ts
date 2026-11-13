import type {
  Contact,
  ContactCount,
  ContactCreateInput,
  ContactPage,
  ContactSortField,
  ContactUpdateInput,
  PageSize,
  SortOrder,
  TagMatchMode,
} from '@crm/shared'
import { request, toSearchParams } from '../../../lib/http'

export type ContactFilterValues = {
  q: string
  tagIds: string[]
  tagMatch: TagMatchMode
  company: string
  createdFrom: string | null
  createdTo: string | null
  hasEmail: boolean | null
  hasPhone: boolean | null
}

export type ContactListRequest = ContactFilterValues & {
  sort: ContactSortField
  order: SortOrder
  limit: PageSize
  cursor: string | null
}

function filterParams(filters: ContactFilterValues) {
  return {
    q: filters.q.trim(),
    tagIds: filters.tagIds,
    tagMatch: filters.tagIds.length > 1 ? filters.tagMatch : null,
    company: filters.company.trim(),
    createdFrom: filters.createdFrom,
    createdTo: filters.createdTo,
    hasEmail: filters.hasEmail,
    hasPhone: filters.hasPhone,
  }
}

export function fetchContacts(list: ContactListRequest, signal?: AbortSignal) {
  const query = toSearchParams({
    ...filterParams(list),
    sort: list.sort,
    order: list.order,
    limit: list.limit,
    cursor: list.cursor,
  })
  return request<ContactPage>(`/contacts${query}`, { signal })
}

export function fetchContactCount(filters: ContactFilterValues, signal?: AbortSignal) {
  return request<ContactCount>(`/contacts/count${toSearchParams(filterParams(filters))}`, {
    signal,
  })
}

export function fetchContact(id: string, signal?: AbortSignal) {
  return request<Contact>(`/contacts/${id}`, { signal })
}

export function createContact(input: ContactCreateInput) {
  return request<Contact>('/contacts', { method: 'POST', body: input })
}

export function updateContact(id: string, input: ContactUpdateInput) {
  return request<Contact>(`/contacts/${id}`, { method: 'PATCH', body: input })
}
