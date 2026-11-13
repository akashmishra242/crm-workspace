import { normalizeSearchTerm, type ContactFilters } from '@crm/shared'
import { and, gte, ilike, inArray, isNotNull, isNull, lt, sql, type SQL } from 'drizzle-orm'
import { contacts, contactTags } from '../../db/schema'
import { escapeLikePattern } from '../../lib/sql'

export function contactFilterCondition(filters: ContactFilters): SQL | undefined {
  return and(
    searchCondition(filters.q),
    tagCondition(filters.tagIds, filters.tagMatch),
    companyCondition(filters.company),
    filters.createdFrom ? gte(contacts.createdAt, startOfUtcDay(filters.createdFrom)) : undefined,
    filters.createdTo ? lt(contacts.createdAt, startOfUtcDay(filters.createdTo, 1)) : undefined,
    presenceCondition(contacts.email, filters.hasEmail),
    presenceCondition(contacts.phone, filters.hasPhone),
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

/** Prefix match on lower(company) so the text_pattern_ops index can serve it. */
function companyCondition(company: string | undefined): SQL | undefined {
  if (!company) return undefined
  const prefix = `${escapeLikePattern(company.toLowerCase())}%`
  return sql`lower(${contacts.company}) like ${prefix}`
}

function presenceCondition(
  column: typeof contacts.email | typeof contacts.phone,
  present: boolean | undefined,
): SQL | undefined {
  if (present === undefined) return undefined
  return present ? isNotNull(column) : isNull(column)
}

function startOfUtcDay(isoDate: string, addDays = 0): Date {
  const date = new Date(`${isoDate}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + addDays)
  return date
}
