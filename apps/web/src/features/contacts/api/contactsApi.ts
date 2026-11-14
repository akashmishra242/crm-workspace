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
import {
  CONDITION_FIELDS,
  serializeCondition,
  type ConditionField,
  type FieldCondition,
} from '@crm/shared'
import { request, toSearchParams } from '../../../lib/http'

export type ContactFilterValues = {
  q: string
  tagIds: string[]
  tagMatch: TagMatchMode
  createdFrom: string | null
  createdTo: string | null
} & Record<ConditionField, FieldCondition | null>

export type ContactListRequest = ContactFilterValues & {
  sort: ContactSortField
  order: SortOrder
  limit: PageSize
  cursor: string | null
  offset: number | null
}

function filterParams(filters: ContactFilterValues) {
  return {
    q: filters.q.trim(),
    tagIds: filters.tagIds,
    tagMatch: filters.tagIds.length > 1 ? filters.tagMatch : null,
    createdFrom: filters.createdFrom,
    createdTo: filters.createdTo,
    ...Object.fromEntries(
      CONDITION_FIELDS.map((field) => {
        const condition = filters[field]
        return [field, condition ? serializeCondition(condition) : null]
      }),
    ),
  }
}

export function fetchContacts(list: ContactListRequest, signal?: AbortSignal) {
  const query = toSearchParams({
    ...filterParams(list),
    sort: list.sort,
    order: list.order,
    limit: list.limit,
    cursor: list.cursor,
    offset: list.offset,
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

export function deleteContact(id: string) {
  return request<void>(`/contacts/${id}`, { method: 'DELETE' })
}

export function restoreContact(id: string) {
  return request<Contact>(`/contacts/${id}/restore`, { method: 'POST' })
}

export function updateContact(id: string, input: ContactUpdateInput) {
  return request<Contact>(`/contacts/${id}`, { method: 'PATCH', body: input })
}
