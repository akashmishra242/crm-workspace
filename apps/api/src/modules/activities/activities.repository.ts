import { ACTIVITY_PAGE_SIZE, type Activity, type ActivityPage } from '@crm/shared'
import { and, desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Database } from '../../db/client'
import { contactActivities, users } from '../../db/schema'
import { decodeCursor, encodeCursor } from '../../lib/cursor'

type NewActivity = typeof contactActivities.$inferInsert

const activityCursorSchema = z.object({
  createdAt: z.string().min(1),
  id: z.int().positive(),
})
type ActivityCursor = z.infer<typeof activityCursorSchema>

export async function insertActivities(db: Database, activities: NewActivity[]): Promise<void> {
  if (activities.length > 0) {
    await db.insert(contactActivities).values(activities)
  }
}

export async function findActivityPage(
  db: Database,
  contactId: string,
  rawCursor: string | undefined,
): Promise<ActivityPage> {
  const cursor = rawCursor ? decodeCursor(rawCursor, activityCursorSchema) : undefined

  const rows = await db
    .select({
      id: contactActivities.id,
      contactId: contactActivities.contactId,
      type: contactActivities.type,
      payload: contactActivities.payload,
      actorId: users.id,
      actorName: users.name,
      actorEmail: users.email,
      createdAt: contactActivities.createdAt,
      // Text keeps microsecond precision, which a JS Date would drop from the cursor.
      createdAtText: sql<string>`${contactActivities.createdAt}::text`,
    })
    .from(contactActivities)
    .leftJoin(users, eq(users.id, contactActivities.actorId))
    .where(and(eq(contactActivities.contactId, contactId), cursor ? olderThan(cursor) : undefined))
    .orderBy(desc(contactActivities.createdAt), desc(contactActivities.id))
    .limit(ACTIVITY_PAGE_SIZE + 1)

  const page = rows.slice(0, ACTIVITY_PAGE_SIZE)
  const last = page.at(-1)
  const hasMore = rows.length > ACTIVITY_PAGE_SIZE

  return {
    data: page.map(toActivity),
    nextCursor:
      hasMore && last ? encodeCursor({ createdAt: last.createdAtText, id: last.id }) : null,
  }
}

type ActivityRow = Pick<
  typeof contactActivities.$inferSelect,
  'id' | 'contactId' | 'type' | 'payload' | 'createdAt'
> & {
  actorId: string | null
  actorName: string | null
  actorEmail: string | null
}

function toActivity(row: ActivityRow): Activity {
  const { actorId, actorName, actorEmail } = row
  // Writers always pair a type with its payload shape, so the row matches exactly one variant.
  return {
    id: String(row.id),
    contactId: row.contactId,
    type: row.type,
    payload: row.payload,
    actor:
      actorId && actorName && actorEmail
        ? { id: actorId, name: actorName, email: actorEmail }
        : null,
    createdAt: row.createdAt.toISOString(),
  } as Activity
}

function olderThan(cursor: ActivityCursor) {
  return sql`(${contactActivities.createdAt}, ${contactActivities.id}) < (${cursor.createdAt}::timestamptz, ${cursor.id})`
}
