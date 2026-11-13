import type { TagColor } from '@crm/shared'
import { eq } from 'drizzle-orm'
import { buildApp } from '../../src/app'
import { connectDatabase, type Database } from '../../src/db/client'
import { contactActivities, contacts, tags, users } from '../../src/db/schema'

export type TestContext = Awaited<ReturnType<typeof createTestApp>>

/** Each test file gets its own in-memory Postgres with the real migrations applied. */
export async function createTestApp() {
  const connection = await connectDatabase({})
  await connection.migrate()
  const app = await buildApp({ db: connection.db, corsOrigins: [], logger: false })

  return {
    app,
    db: connection.db,
    close: async () => {
      await app.close()
      await connection.close()
    },
  }
}

type NewContact = typeof contacts.$inferInsert

export async function insertContacts(db: Database, rows: Array<Partial<NewContact>>) {
  return db
    .insert(contacts)
    .values(rows.map((row) => ({ firstName: 'Test', ...row })))
    .returning()
}

export async function insertContact(db: Database, row: Partial<NewContact> = {}) {
  const [contact] = await insertContacts(db, [row])
  if (!contact) throw new Error('Contact was not inserted')
  return contact
}

export async function insertTag(db: Database, name: string, color: TagColor = 'gray') {
  const [tag] = await db.insert(tags).values({ name, color }).returning()
  if (!tag) throw new Error('Tag was not inserted')
  return tag
}

export async function activitiesOf(db: Database, contactId: string) {
  return db.select().from(contactActivities).where(eq(contactActivities.contactId, contactId))
}

export async function insertUser(db: Database, name: string, email: string) {
  const [user] = await db.insert(users).values({ name, email }).returning()
  if (!user) throw new Error('User was not inserted')
  return user
}
