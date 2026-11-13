import type { User } from '@crm/shared'
import { queryOptions } from '@tanstack/react-query'
import { request } from '../../../lib/http'
import { getCurrentUserId, setCurrentUserId } from '../../../lib/session'

/**
 * Loads the workspace's teammates. On a first visit (or if the stored teammate no longer
 * exists) the browser starts acting as the first teammate, so every change is attributed.
 */
export function userListQuery() {
  return queryOptions({
    queryKey: ['users'] as const,
    queryFn: async ({ signal }) => {
      const users = await request<User[]>('/users', { signal })
      const first = users[0]
      if (first && !users.some((user) => user.id === getCurrentUserId())) {
        setCurrentUserId(first.id)
      }
      return users
    },
    staleTime: Infinity,
  })
}
