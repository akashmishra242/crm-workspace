import type { BulkActionPage } from '@crm/shared'
import { infiniteQueryOptions } from '@tanstack/react-query'
import { request, toSearchParams } from '../../lib/http'

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
