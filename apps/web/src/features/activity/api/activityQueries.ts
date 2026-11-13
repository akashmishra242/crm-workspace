import { infiniteQueryOptions } from '@tanstack/react-query'
import { fetchActivity } from './activityApi'

export const activityKeys = {
  all: ['activity'] as const,
  contact: (contactId: string) => [...activityKeys.all, contactId] as const,
}

export function contactActivityQuery(contactId: string) {
  return infiniteQueryOptions({
    queryKey: activityKeys.contact(contactId),
    queryFn: ({ pageParam, signal }) => fetchActivity(contactId, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })
}
