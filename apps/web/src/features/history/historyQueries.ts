import type { ActivityFeedPage, ActivityType, BulkActionPage } from '@crm/shared'
import { infiniteQueryOptions } from '@tanstack/react-query'
import { request, toSearchParams } from '../../lib/http'
import { activityKeys } from '../activity/api/activityQueries'

export const bulkActionKeys = {
  all: ['bulk-actions'] as const,
}

export function bulkActionListQuery() {
  return infiniteQueryOptions({
    queryKey: bulkActionKeys.all,
    queryFn: ({ pageParam, signal }) =>
      request<BulkActionPage>(`/bulk-actions${toSearchParams({ cursor: pageParam })}`, { signal }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })
}

export type ActivityFeedFilters = {
  type: ActivityType | null
  actorId: string | null
}

/** Under the activity keys, so anything that refreshes activity refreshes this too. */
export function activityFeedQuery(filters: ActivityFeedFilters) {
  return infiniteQueryOptions({
    queryKey: [...activityKeys.all, 'feed', filters] as const,
    queryFn: ({ pageParam, signal }) =>
      request<ActivityFeedPage>(
        `/activities${toSearchParams({ cursor: pageParam, type: filters.type, actorId: filters.actorId })}`,
        { signal },
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })
}
