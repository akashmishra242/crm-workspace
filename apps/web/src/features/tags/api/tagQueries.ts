import { queryOptions } from '@tanstack/react-query'
import { fetchTags } from './tagsApi'

export const tagKeys = {
  all: ['tags'] as const,
}

/** An account has tens of tags, not thousands, so the picker filters a cached list locally. */
export function tagListQuery() {
  return queryOptions({
    queryKey: tagKeys.all,
    queryFn: ({ signal }) => fetchTags(signal),
    staleTime: 5 * 60_000,
  })
}
