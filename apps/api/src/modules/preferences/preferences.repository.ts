import type { PreferenceKey, PreferenceMap, StoredPreference } from '@crm/shared'
import { and, eq, sql } from 'drizzle-orm'
import type { Database } from '../../db/client'
import { userPreferences } from '../../db/schema'

export async function findPreferences(db: Database, userId: string): Promise<PreferenceMap> {
  const rows = await db
    .select({
      key: userPreferences.key,
      value: userPreferences.value,
      updatedAt: userPreferences.updatedAt,
    })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))

  return Object.fromEntries(
    rows.map((row) => [row.key, { value: row.value, updatedAt: row.updatedAt.toISOString() }]),
  )
}

/**
 * Last write wins, judged by when the change was made on the client rather than when it
 * reached us: a delayed save from one device can't overwrite a newer one from another.
 * Returns whatever is stored afterwards, so the client can adopt the winner.
 */
export async function savePreference(
  db: Database,
  userId: string,
  key: PreferenceKey,
  preference: StoredPreference,
): Promise<StoredPreference> {
  const updatedAt = new Date(preference.updatedAt)
  await db
    .insert(userPreferences)
    .values({ userId, key, value: preference.value, updatedAt })
    .onConflictDoUpdate({
      target: [userPreferences.userId, userPreferences.key],
      set: { value: sql`excluded.value`, updatedAt: sql`excluded.updated_at` },
      setWhere: sql`excluded.updated_at >= ${userPreferences.updatedAt}`,
    })

  const [stored] = await db
    .select({ value: userPreferences.value, updatedAt: userPreferences.updatedAt })
    .from(userPreferences)
    .where(and(eq(userPreferences.userId, userId), eq(userPreferences.key, key)))
  if (!stored) throw new Error(`Preference ${key} was not stored`)
  return { value: stored.value, updatedAt: stored.updatedAt.toISOString() }
}
