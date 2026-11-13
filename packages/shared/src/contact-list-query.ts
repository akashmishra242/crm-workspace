import { z } from 'zod'
import type { Contact } from './contact'

export const CONTACT_SORT_FIELDS = ['name', 'createdAt'] as const
export type ContactSortField = (typeof CONTACT_SORT_FIELDS)[number]

export const SORT_ORDERS = ['asc', 'desc'] as const
export type SortOrder = (typeof SORT_ORDERS)[number]

export const PAGE_SIZES = [20, 50, 100] as const
export type PageSize = (typeof PAGE_SIZES)[number]
export const DEFAULT_PAGE_SIZE: PageSize = 20

export const TAG_MATCH_MODES = ['any', 'all'] as const
export type TagMatchMode = (typeof TAG_MATCH_MODES)[number]

const commaSeparatedIds = z
  .string()
  .transform((value) => value.split(',').filter(Boolean))
  .pipe(z.array(z.uuid()).max(20))

const booleanFlag = z.enum(['true', 'false']).transform((value) => value === 'true')

const filterShape = {
  q: z.string().trim().max(100).optional(),
  tagIds: commaSeparatedIds.optional(),
  tagMatch: z.enum(TAG_MATCH_MODES).default('any'),
  company: z.string().trim().max(120).optional(),
  createdFrom: z.iso.date().optional(),
  createdTo: z.iso.date().optional(),
  hasEmail: booleanFlag.optional(),
  hasPhone: booleanFlag.optional(),
}

const dateRangeIsOrdered = (filters: { createdFrom?: string; createdTo?: string }) =>
  !filters.createdFrom || !filters.createdTo || filters.createdFrom <= filters.createdTo

const dateRangeIssue = { message: 'Start date must be on or before end date', path: ['createdTo'] }

/** Query-string contract for counting contacts. Dates are calendar days in UTC. */
export const contactFiltersSchema = z.object(filterShape).refine(dateRangeIsOrdered, dateRangeIssue)
export type ContactFilters = z.output<typeof contactFiltersSchema>

export const contactListQuerySchema = z
  .object({
    ...filterShape,
    sort: z.enum(CONTACT_SORT_FIELDS).default('createdAt'),
    order: z.enum(SORT_ORDERS).default('desc'),
    limit: z.coerce
      .number()
      .refine((value): value is PageSize => (PAGE_SIZES as readonly number[]).includes(value), {
        message: `Page size must be one of ${PAGE_SIZES.join(', ')}`,
      })
      .default(DEFAULT_PAGE_SIZE),
    cursor: z.string().max(500).optional(),
  })
  .refine(dateRangeIsOrdered, dateRangeIssue)
export type ContactListQuery = z.output<typeof contactListQuerySchema>

export type ContactPage = {
  data: Contact[]
  page: {
    nextCursor: string | null
    prevCursor: string | null
  }
}

export type ContactCount = {
  count: number
}
