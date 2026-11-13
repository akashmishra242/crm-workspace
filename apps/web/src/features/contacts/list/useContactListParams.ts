import { CONTACT_SORT_FIELDS, SORT_ORDERS, TAG_MATCH_MODES } from '@crm/shared'
import type { ContactSortField, PageSize, SortOrder } from '@crm/shared'
import {
  createParser,
  createSerializer,
  type inferParserType,
  parseAsArrayOf,
  parseAsBoolean,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from 'nuqs'
import { z } from 'zod'
import type { ContactFilterValues, ContactListRequest } from '../api/contactsApi'

/** Accepts a URL value only if it passes `schema`; anything else falls back to the default. */
function parseAsValid(schema: z.ZodType<string>) {
  return createParser({
    parse: (value) => (schema.safeParse(value).success ? value : null),
    serialize: (value: string) => value,
  })
}

const parseAsPageNumber = createParser({
  parse: (value) => {
    const page = Number(value)
    return Number.isInteger(page) && page >= 1 ? page : null
  },
  serialize: String,
})

/**
 * The URL is the single source of truth for the list view: search, filters, sort and
 * position. Views are shareable, survive reloads and work with back/forward.
 */
const contactListParsers = {
  q: parseAsString.withDefault(''),
  tagIds: parseAsArrayOf(parseAsValid(z.uuid())).withDefault([]),
  tagMatch: parseAsStringLiteral(TAG_MATCH_MODES).withDefault('any'),
  company: parseAsString.withDefault(''),
  createdFrom: parseAsValid(z.iso.date()),
  createdTo: parseAsValid(z.iso.date()),
  hasEmail: parseAsBoolean,
  hasPhone: parseAsBoolean,
  sort: parseAsStringLiteral(CONTACT_SORT_FIELDS).withDefault('createdAt'),
  order: parseAsStringLiteral(SORT_ORDERS).withDefault('desc'),
  cursor: parseAsString,
  page: parseAsPageNumber.withDefault(1),
}

const urlKeys = {
  tagIds: 'tags',
  tagMatch: 'match',
  createdFrom: 'from',
  createdTo: 'to',
} as const

export type ContactListParams = inferParserType<typeof contactListParsers>

export const serializeContactListParams = createSerializer(contactListParsers, { urlKeys })

const FIRST_PAGE = { cursor: null, page: null }

const NO_FILTERS = {
  tagIds: null,
  tagMatch: null,
  company: null,
  createdFrom: null,
  createdTo: null,
  hasEmail: null,
  hasPhone: null,
}

export function countActiveFilters(filters: Omit<ContactFilterValues, 'q'>): number {
  return [
    filters.tagIds.length > 0,
    filters.company.trim() !== '',
    filters.createdFrom !== null || filters.createdTo !== null,
    filters.hasEmail !== null,
    filters.hasPhone !== null,
  ].filter(Boolean).length
}

export function toFilterValues(params: ContactListParams): ContactFilterValues {
  const { q, tagIds, tagMatch, company, createdFrom, createdTo, hasEmail, hasPhone } = params
  return { q, tagIds, tagMatch, company, createdFrom, createdTo, hasEmail, hasPhone }
}

export function toListRequest(params: ContactListParams, limit: PageSize): ContactListRequest {
  return {
    ...toFilterValues(params),
    sort: params.sort,
    order: params.order,
    cursor: params.cursor,
    limit,
  }
}

export function useContactListParams() {
  const [params, setParams] = useQueryStates(contactListParsers, { urlKeys })

  return {
    params,
    filters: toFilterValues(params),
    sort: params.sort,
    order: params.order,
    cursor: params.cursor,
    page: params.page,
    /** Typing replaces the history entry so Back doesn't replay every keystroke. */
    setSearch: (q: string) => setParams({ q: q || null, ...FIRST_PAGE }, { history: 'replace' }),
    setFilters: (next: Partial<ContactFilterValues>) =>
      setParams({ ...next, ...FIRST_PAGE }, { history: 'push' }),
    clearFilters: () => setParams({ ...NO_FILTERS, ...FIRST_PAGE }, { history: 'push' }),
    clearSearchAndFilters: () =>
      setParams({ q: null, ...NO_FILTERS, ...FIRST_PAGE }, { history: 'push' }),
    setSort: (nextSort: ContactSortField, nextOrder: SortOrder) =>
      setParams({ sort: nextSort, order: nextOrder, ...FIRST_PAGE }, { history: 'push' }),
    goToPage: (nextCursor: string | null, nextPage: number) =>
      setParams({ cursor: nextCursor, page: nextPage }, { history: 'push' }),
  }
}
