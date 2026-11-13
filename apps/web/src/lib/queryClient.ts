import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { QueryClient } from '@tanstack/react-query'
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client'
import { del, get, set } from 'idb-keyval'
import { isApiError } from './http'

const MAX_RETRIES = 2
const DAY_MS = 24 * 60 * 60 * 1000
const NOT_PERSISTED = new Set(['preferences', 'users', 'activity'])

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        // 4xx responses will not succeed on retry; network and 5xx errors might.
        retry: (failureCount, error) =>
          !(isApiError(error) && error.status >= 400 && error.status < 500) &&
          failureCount < MAX_RETRIES,
      },
      mutations: {
        retry: false,
        // Fail straight away when offline instead of silently queueing the save for later.
        networkMode: 'always',
      },
    },
  })
}

/**
 * Saves fetched lists, counts and tags to IndexedDB. The next visit shows them at once while
 * fresh data loads, and pages already seen stay readable offline. Every query is still
 * refetched as usual; the stored copy is only a starting point. A new deploy discards it, so
 * data in an old shape is never read back.
 */
export const queryPersistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister: createAsyncStoragePersister({
    storage: {
      getItem: (key) => get<string>(key),
      setItem: (key, value) => set(key, value),
      removeItem: (key) => del(key),
    },
    key: 'crm.queryCache',
    throttleTime: 1_000,
  }),
  maxAge: DAY_MS,
  buster: __BUILD_ID__,
  dehydrateOptions: {
    // Single contacts are left out: the edit form must start from the server's current
    // version. Preferences have their own store, and the teammate list must always be current.
    shouldDehydrateQuery: (query) =>
      query.state.status === 'success' &&
      !NOT_PERSISTED.has(String(query.queryKey[0])) &&
      query.queryKey[1] !== 'detail',
    shouldDehydrateMutation: () => false,
  },
}
