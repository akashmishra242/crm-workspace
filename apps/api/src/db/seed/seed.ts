import { parseArgs } from 'node:util'
import { sql } from 'drizzle-orm'
import { loadEnv } from '../../config/env'
import { connectDatabase, connectionOptionsFromEnv } from '../client'
import { contactActivities, contacts, contactTags, tags, users } from '../schema'
import { generateContacts, SEED_TAGS, SEED_USERS, type SeedContact } from './fixtures'

const BATCH_SIZE = 500

const { values } = parseArgs({
  // `pnpm db:seed -- --count 50000` forwards the literal "--", which would end option parsing.
  args: process.argv.slice(2).filter((arg) => arg !== '--'),
  options: { count: { type: 'string', default: '2000' } },
})
const count = Number(values.count)
if (!Number.isInteger(count) || count < 1) {
  throw new Error(`--count must be a positive integer, received "${values.count}"`)
}

const connection = await connectDatabase(connectionOptionsFromEnv(loadEnv()))
const { db } = connection
await connection.migrate()

console.info(`Seeding ${count} contacts (existing data is replaced)…`)

await db.execute(sql`TRUNCATE ${contacts}, ${tags}, ${users} CASCADE`)
const seedUsers = inOrder(
  SEED_USERS,
  await db
    .insert(users)
    .values([...SEED_USERS])
    .returning(),
)
const seedTags = inOrder(
  SEED_TAGS,
  await db
    .insert(tags)
    .values([...SEED_TAGS])
    .returning(),
)

const seedContacts = generateContacts(count, new Date())

for (let start = 0; start < seedContacts.length; start += BATCH_SIZE) {
  const batch = seedContacts.slice(start, start + BATCH_SIZE)
  const tagRows = batch.flatMap(tagAssignments)

  await db.insert(contacts).values(batch.map(contactRow))
  if (tagRows.length > 0) {
    await db
      .insert(contactTags)
      .values(
        tagRows.map(({ contactId, tag, createdAt }) => ({ contactId, tagId: tag.id, createdAt })),
      )
  }
  await db.insert(contactActivities).values([
    ...batch.map((contact) => ({
      contactId: contact.id,
      type: 'CONTACT_CREATED' as const,
      payload: {},
      actorId: userId(contact.createdBy),
      createdAt: contact.createdAt,
    })),
    ...tagRows.map(({ contactId, tag, createdAt, actorId }) => ({
      contactId,
      type: 'TAG_ADDED' as const,
      payload: { tagId: tag.id, tagName: tag.name, tagColor: tag.color, source: 'single' as const },
      actorId,
      createdAt,
    })),
    ...batch.flatMap(editActivity),
  ])
}

await connection.close()
console.info(`Seeded ${count} contacts, ${seedTags.length} tags and ${seedUsers.length} teammates.`)

function contactRow({
  createdBy: _createdBy,
  tags: contactTagList,
  edit,
  ...contact
}: SeedContact) {
  const taggedAt = minutesAfter(contact.createdAt, contactTagList.length)
  const lastActivityAt = edit && edit.at > taggedAt ? edit.at : taggedAt
  return {
    ...contact,
    // An edited contact has been saved once more than it was created.
    version: edit ? 2 : 1,
    updatedAt: lastActivityAt,
    lastActivityAt,
  }
}

/** Tags are applied one minute apart after creation, so the activity feed reads naturally. */
function tagAssignments(contact: SeedContact) {
  return contact.tags.flatMap(({ tagIndex, addedBy }, position) => {
    const tag = seedTags[tagIndex]
    return tag
      ? [
          {
            contactId: contact.id,
            tag,
            actorId: userId(addedBy),
            createdAt: minutesAfter(contact.createdAt, position + 1),
          },
        ]
      : []
  })
}

function editActivity({ id, edit, company, phone }: SeedContact) {
  if (!edit) return []
  const to = edit.field === 'company' ? company : phone
  return [
    {
      contactId: id,
      type: 'CONTACT_UPDATED' as const,
      payload: { changes: { [edit.field]: { from: edit.from, to } } },
      actorId: userId(edit.by),
      createdAt: edit.at,
    },
  ]
}

function userId(index: number): string | null {
  return seedUsers[index]?.id ?? null
}

/** Matches inserted rows back to the fixture order, independent of RETURNING order. */
function inOrder<T extends { name: string }>(fixtures: ReadonlyArray<{ name: string }>, rows: T[]) {
  return fixtures.map((fixture) => {
    const row = rows.find((inserted) => inserted.name === fixture.name)
    if (!row) throw new Error(`Seed row "${fixture.name}" was not inserted`)
    return row
  })
}

function minutesAfter(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000)
}
