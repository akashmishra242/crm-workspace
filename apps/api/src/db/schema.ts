import {
  ACTIVITY_TYPES,
  TAG_COLORS,
  type ContactChanges,
  type TagActivityPayload,
} from '@crm/shared'
import { sql } from 'drizzle-orm'
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow()

export const users = pgTable('users', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  email: text().notNull().unique(),
  createdAt: createdAt(),
})

export const userPreferences = pgTable(
  'user_preferences',
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    key: text().notNull(),
    value: jsonb().notNull(),
    updatedAt: timestamp({ withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.key] })],
)

export const contacts = pgTable(
  'contacts',
  {
    id: uuid().primaryKey().defaultRandom(),
    firstName: text().notNull(),
    lastName: text().notNull().default(''),
    email: text(),
    phone: text(),
    company: text(),
    version: integer().notNull().default(1),
    createdAt: createdAt(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastActivityAt: timestamp({ withTimezone: true }),
    sortName: text()
      .notNull()
      .generatedAlwaysAs(sql`lower(first_name || ' ' || last_name)`),
    // Phone digits are indexed without formatting so "(415) 555" and "+1415555" both match.
    searchText: text()
      .notNull()
      .generatedAlwaysAs(
        sql`lower(first_name || ' ' || last_name || ' ' || coalesce(email, '') || ' ' || regexp_replace(coalesce(phone, ''), '\\D', '', 'g'))`,
      ),
  },
  (table) => [
    check('contacts_first_name_present', sql`length(trim(${table.firstName})) > 0`),
    uniqueIndex('contacts_email_unique')
      .on(table.email)
      .where(sql`${table.email} is not null`),
    index('contacts_search_trgm').using('gin', table.searchText.op('gin_trgm_ops')),
    index('contacts_sort_name_id').on(table.sortName, table.id),
    index('contacts_created_at_id').on(table.createdAt, table.id),
    index('contacts_company_prefix').on(sql`lower(${table.company}) text_pattern_ops`),
  ],
)

export const tags = pgTable(
  'tags',
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    color: text({ enum: TAG_COLORS }).notNull().default('gray'),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex('tags_name_unique').on(sql`lower(${table.name})`)],
)

export const contactTags = pgTable(
  'contact_tags',
  {
    contactId: uuid()
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    tagId: uuid()
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.contactId, table.tagId] }),
    index('contact_tags_tag_contact').on(table.tagId, table.contactId),
  ],
)

export const activityType = pgEnum('activity_type', ACTIVITY_TYPES)

export const contactActivities = pgTable(
  'contact_activities',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    contactId: uuid()
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),
    type: activityType().notNull(),
    payload: jsonb()
      .$type<{ changes: ContactChanges } | TagActivityPayload | Record<string, never>>()
      .notNull()
      .default({}),
    actorId: uuid().references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (table) => [
    index('contact_activities_contact_created').on(
      table.contactId,
      table.createdAt.desc().nullsFirst(),
      table.id.desc().nullsFirst(),
    ),
  ],
)
