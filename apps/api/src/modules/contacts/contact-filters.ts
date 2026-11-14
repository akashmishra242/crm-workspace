import {
  normalizeSearchTerm,
  toE164,
  type ConditionField,
  type ContactFilters,
  type FieldCondition,
} from '@crm/shared'
import { and, gte, ilike, inArray, isNull, lt, sql, type SQL } from 'drizzle-orm'
import { contacts, contactTags } from '../../db/schema'
import { escapeLikePattern } from '../../lib/sql'

/** Every list and count starts here, so deleted contacts can't leak into any of them. */
export function contactFilterCondition(filters: ContactFilters): SQL | undefined {
  return and(
    isNull(contacts.deletedAt),
    searchCondition(filters.q),
    tagCondition(filters.tagIds, filters.tagMatch),
    filters.createdFrom ? gte(contacts.createdAt, startOfUtcDay(filters.createdFrom)) : undefined,
    filters.createdTo ? lt(contacts.createdAt, startOfUtcDay(filters.createdTo, 1)) : undefined,
    fieldCondition('firstName', filters.firstName),
    fieldCondition('lastName', filters.lastName),
    fieldCondition('email', filters.email),
    fieldCondition('phone', filters.phone),
    fieldCondition('company', filters.company),
  )
}

function searchCondition(q: string | undefined): SQL | undefined {
  const term = q ? normalizeSearchTerm(q) : ''
  return term ? ilike(contacts.searchText, `%${escapeLikePattern(term)}%`) : undefined
}

function tagCondition(
  tagIds: string[] | undefined,
  match: ContactFilters['tagMatch'],
): SQL | undefined {
  const uniqueTagIds = [...new Set(tagIds)]
  if (uniqueTagIds.length === 0) return undefined

  const assignedMatchingTags = sql`
    from ${contactTags}
    where ${contactTags.contactId} = ${contacts.id}
      and ${inArray(contactTags.tagId, uniqueTagIds)}`

  return match === 'all'
    ? sql`(select count(*) ${assignedMatchingTags}) = ${uniqueTagIds.length}`
    : sql`exists (select 1 ${assignedMatchingTags})`
}

/**
 * How each field is compared. Text is compared case-insensitively; phones by their digits,
 * so "(415) 555" matches "+1415555…". Last name is never NULL (it defaults to ''), so an
 * empty string counts as missing.
 */
const comparable: Record<ConditionField, SQL> = {
  firstName: sql`lower(${contacts.firstName})`,
  lastName: sql`lower(nullif(${contacts.lastName}, ''))`,
  email: sql`${contacts.email}`,
  phone: sql`regexp_replace(${contacts.phone}, '\\D', '', 'g')`,
  company: sql`lower(${contacts.company})`,
}

/** Fields that are part of `search_text`, whose trigram index can narrow "contains" first. */
const IN_SEARCH_TEXT: ReadonlySet<ConditionField> = new Set([
  'firstName',
  'lastName',
  'email',
  'phone',
])

function normalizeValue(field: ConditionField, value: string): string {
  if (field === 'phone') return value.replace(/\D/g, '')
  return value.toLowerCase()
}

/**
 * Negative conditions ("is not", "does not contain") also match contacts that have no
 * value at all: a contact without an email doesn't contain "acme" either.
 */
function fieldCondition(field: ConditionField, condition?: FieldCondition): SQL | undefined {
  if (!condition) return undefined
  const column = comparable[field]
  const value = normalizeValue(field, condition.value)
  const pattern = `%${escapeLikePattern(value)}%`

  switch (condition.operator) {
    case 'exists':
      return sql`${column} is not null`
    case 'notExists':
      return sql`${column} is null`
    case 'is':
      return sql`${column} = ${exactValue(field, condition.value, value)}`
    case 'isNot':
      return sql`${column} is distinct from ${exactValue(field, condition.value, value)}`
    case 'contains':
      // The extra search_text check is redundant for correctness but lets Postgres use the
      // trigram index to find candidates instead of scanning every row.
      return IN_SEARCH_TEXT.has(field)
        ? sql`(${contacts.searchText} like ${pattern} and ${column} like ${pattern})`
        : sql`${column} like ${pattern}`
    case 'notContains':
      return sql`coalesce(${column}, '') not like ${pattern}`
  }
}

/** A full phone number is compared in E.164 form, which is how phones are stored. */
function exactValue(field: ConditionField, raw: string, normalized: string): string {
  if (field !== 'phone') return normalized
  return (toE164(raw) ?? raw).replace(/\D/g, '')
}

function startOfUtcDay(isoDate: string, addDays = 0): Date {
  const date = new Date(`${isoDate}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + addDays)
  return date
}
