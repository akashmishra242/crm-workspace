import type { PageSize } from '@crm/shared'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue'
import { useAppSettings } from '../../settings/useAppSettings'
import { contactCountQuery, contactDetailQuery, contactListQuery } from '../api/contactQueries'
import { toFilterValues, toListRequest, useContactListParams } from './useContactListParams'
import { usePageSize } from './usePageSize'

const SEARCH_DEBOUNCE_MS = 300

/**
 * Wires URL state to the list and count queries. While the user is still typing, both
 * queries pause and keep showing the previous results instead of firing per keystroke.
 */
export function useContactsList() {
  const queryClient = useQueryClient()
  const listParams = useContactListParams()
  const [pageSize, setPageSize] = usePageSize()
  const { settings } = useAppSettings()

  const debouncedQuery = useDebouncedValue(listParams.params.q, SEARCH_DEBOUNCE_MS)
  const isSearchPending = debouncedQuery !== listParams.params.q
  const settledParams = { ...listParams.params, q: debouncedQuery }

  const contacts = useQuery({
    ...contactListQuery(toListRequest(settledParams, pageSize)),
    enabled: !isSearchPending,
  })
  const count = useQuery({
    ...contactCountQuery(toFilterValues(settledParams)),
    enabled: !isSearchPending,
  })

  function changePageSize(size: PageSize) {
    setPageSize(size)
    listParams.goToPage(null, 1)
  }

  /**
   * Preloading on hover is opt-in (Settings): it makes the next click instant but spends
   * requests on rows that may never be opened, so each teammate decides.
   */
  const prefetchPage = settings.preloadOnHover
    ? (cursor: string) =>
        void queryClient.prefetchQuery(
          contactListQuery(toListRequest({ ...settledParams, cursor }, pageSize)),
        )
    : undefined
  const prefetchContact = settings.preloadOnHover
    ? (id: string) => void queryClient.prefetchQuery(contactDetailQuery(id))
    : undefined

  return {
    listParams,
    pageSize,
    changePageSize,
    contacts,
    count,
    isSearchPending,
    prefetchPage,
    prefetchContact,
  }
}
