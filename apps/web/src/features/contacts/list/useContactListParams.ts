import {
  CONDITION_FIELDS,
  CONTACT_SORT_FIELDS,
  OPERATORS_BY_FIELD,
  parseCondition,
  serializeCondition,
  SORT_ORDERS,
  TAG_MATCH_MODES,
  type ConditionField,
  type ContactSortField,
  type FieldCondition,
  type PageSize,
  type SortOrder,
} from '@crm/shared'
import {
  createParser,
  createSerializer,
  type inferParserType,
  parseAsArrayOf,
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

/** `email=contains:acme`; a condition the field doesn't support is ignored. */
function parseAsCondition(field: ConditionField) {
  return createParser<FieldCondition>({
    parse: (value) => {
      const condition = parseCondition(value)
      return condition && OPERATORS_BY_FIELD[field].includes(condition.operator) ? condition : null
    },
    serialize: serializeCondition,
    eq: (a, b) => a.operator === b.operator && a.value === b.value,
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
  createdFrom: parseAsValid(z.iso.date()),
  createdTo: parseAsValid(z.iso.date()),
  firstName: parseAsCondition('firstName'),
  lastName: parseAsCondition('lastName'),
  email: parseAsCondition('email'),
  phone: parseAsCondition('phone'),
  company: parseAsCondition('company'),
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

export const NO_FILTERS = {
  tagIds: [],
  tagMatch: 'any',
  createdFrom: null,
  createdTo: null,
  firstName: null,
  lastName: null,
  email: null,
  phone: null,
  company: null,
} satisfies Omit<ContactFilterValues, 'q'>

export function countActiveFilters(filters: Omit<ContactFilterValues, 'q'>): number {
  return [
    filters.tagIds.length > 0,
    filters.createdFrom !== null || filters.createdTo !== null,
    ...CONDITION_FIELDS.map((field) => filters[field] !== null),
  ].filter(Boolean).length
}

export function toFilterValues(params: ContactListParams): ContactFilterValues {
  const { q, tagIds, tagMatch, createdFrom, createdTo } = params
  const { firstName, lastName, email, phone, company } = params
  return { q, tagIds, tagMatch, createdFrom, createdTo, firstName, lastName, email, phone, company }
}

/**
 * Next and Prev carry a cursor. A page number without one (a jump, or a shared link) is
 * fetched by offset, and from there Next and Prev use the cursors that come back.
 */
export function toListRequest(params: ContactListParams, limit: PageSize): ContactListRequest {
  return {
    ...toFilterValues(params),
    sort: params.sort,
    order: params.order,
    cursor: params.cursor,
    offset: params.cursor || params.page <= 1 ? null : (params.page - 1) * limit,
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
      setParams(
        { cursor: nextPage <= 1 ? null : nextCursor, page: nextPage <= 1 ? null : nextPage },
        { history: 'push' },
      ),
  }
}
