import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { contactCountQuery, contactListQuery } from '../api/contactQueries'
import {
  serializeContactListParams,
  toFilterValues,
  toListRequest,
  useContactListParams,
} from '../list/useContactListParams'
import { usePageSize } from '../list/usePageSize'

/**
 * "5 / 1,102  ‹ ›" stepping through the list the user came from. The detail URL carries
 * the same list parameters, so the current page is usually already cached; crossing a
 * page boundary fetches the neighbouring page with its keyset cursor.
 */
export function useContactNeighbors(contactId: string) {
  const { params } = useContactListParams()
  const [pageSize] = usePageSize()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const request = toListRequest(params, pageSize)
  const listPage = useQuery(contactListQuery(request))
  const count = useQuery(contactCountQuery(toFilterValues(params)))

  const rows = listPage.data?.data ?? []
  const index = rows.findIndex((contact) => contact.id === contactId)
  if (listPage.isPlaceholderData || index === -1) return null

  const pageInfo = listPage.data?.page
  const hasPrevious = index > 0 || Boolean(pageInfo?.prevCursor)
  const hasNext = index < rows.length - 1 || Boolean(pageInfo?.nextCursor)

  function open(id: string, cursor: string | null, page: number) {
    void navigate(serializeContactListParams(`/contacts/${id}`, { ...params, cursor, page }))
  }

  async function step(direction: 'previous' | 'next') {
    const neighbour = rows[direction === 'next' ? index + 1 : index - 1]
    if (neighbour) {
      open(neighbour.id, params.cursor, params.page)
      return
    }
    const page = direction === 'next' ? params.page + 1 : params.page - 1
    const pageCursor = direction === 'next' ? pageInfo?.nextCursor : pageInfo?.prevCursor
    const cursor = page <= 1 ? null : (pageCursor ?? null)
    const adjacent = await queryClient.fetchQuery(contactListQuery({ ...request, cursor }))
    const target = direction === 'next' ? adjacent.data.at(0) : adjacent.data.at(-1)
    if (target) open(target.id, cursor, Math.max(1, page))
  }

  return {
    position: (params.page - 1) * pageSize + index + 1,
    total: count.data?.count,
    hasPrevious,
    hasNext,
    goPrevious: () => void step('previous'),
    goNext: () => void step('next'),
  }
}
