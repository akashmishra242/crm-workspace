import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import {
  fetchContact,
  fetchContactCount,
  fetchContacts,
  type ContactFilterValues,
  type ContactListRequest,
} from './contactsApi'

export const contactKeys = {
  all: ['contacts'] as const,
  lists: () => [...contactKeys.all, 'list'] as const,
  list: (list: ContactListRequest) => [...contactKeys.lists(), list] as const,
  counts: () => [...contactKeys.all, 'count'] as const,
  count: (filters: ContactFilterValues) => [...contactKeys.counts(), filters] as const,
  details: () => [...contactKeys.all, 'detail'] as const,
  detail: (id: string) => [...contactKeys.details(), id] as const,
}

export function contactListQuery(list: ContactListRequest) {
  return queryOptions({
    queryKey: contactKeys.list(list),
    queryFn: ({ signal }) => fetchContacts(list, signal),
    placeholderData: keepPreviousData,
  })
}

export function contactCountQuery(filters: ContactFilterValues) {
  return queryOptions({
    queryKey: contactKeys.count(filters),
    queryFn: ({ signal }) => fetchContactCount(filters, signal),
    // Counting is the most expensive list query, and an exact total can lag a few seconds.
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
}

export function contactDetailQuery(id: string) {
  return queryOptions({
    queryKey: contactKeys.detail(id),
    queryFn: ({ signal }) => fetchContact(id, signal),
  })
}
